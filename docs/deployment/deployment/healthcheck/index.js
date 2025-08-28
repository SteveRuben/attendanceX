/**
 * Service de health check pour AttendanceX
 */

const express = require('express');
const http = require('http');
const net = require('net');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const app = express();
const port = process.env.PORT || 8080;
const checkInterval = parseInt(process.env.CHECK_INTERVAL) || 30; // secondes
const services = (process.env.SERVICES || '').split(',').map(s => {
  const [name, port] = s.split(':');
  return { name: name.trim(), port: parseInt(port) };
}).filter(s => s.name && s.port);

// État des services
let serviceStatus = {};
let lastCheck = null;

// Middleware
app.use(express.json());

// Fonction de vérification d'un port TCP
const checkTCPPort = (host, port, timeout = 5000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onError);
    
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
};

// Fonction de vérification HTTP
const checkHTTP = (url, timeout = 5000) => {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout }, (res) => {
      resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 400
      });
    });
    
    request.on('error', () => resolve({ status: 0, ok: false }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0, ok: false });
    });
  });
};

// Vérification des services
const checkServices = async () => {
  console.log('Vérification des services...');
  const results = {};
  
  for (const service of services) {
    const startTime = Date.now();
    
    try {
      // Vérification TCP
      const tcpOk = await checkTCPPort(service.name, service.port);
      const responseTime = Date.now() - startTime;
      
      results[service.name] = {
        name: service.name,
        port: service.port,
        status: tcpOk ? 'up' : 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          tcp: tcpOk
        }
      };
      
      // Vérifications spécifiques par service
      if (tcpOk) {
        switch (service.name) {
          case 'frontend':
            const frontendCheck = await checkHTTP(`http://${service.name}:${service.port}`);
            results[service.name].details.http = frontendCheck.ok;
            results[service.name].details.httpStatus = frontendCheck.status;
            break;
            
          case 'backend':
            const backendCheck = await checkHTTP(`http://${service.name}:${service.port}/api/health`);
            results[service.name].details.http = backendCheck.ok;
            results[service.name].details.httpStatus = backendCheck.status;
            break;
            
          case 'postgres':
            try {
              const { stdout } = await exec(`nc -z ${service.name} ${service.port}`);
              results[service.name].details.connection = true;
            } catch (error) {
              results[service.name].details.connection = false;
            }
            break;
            
          case 'redis':
            try {
              const { stdout } = await exec(`echo "PING" | nc ${service.name} ${service.port}`);
              results[service.name].details.ping = stdout.includes('PONG');
            } catch (error) {
              results[service.name].details.ping = false;
            }
            break;
        }
      }
      
      console.log(`✓ ${service.name}:${service.port} - ${results[service.name].status} (${responseTime}ms)`);
      
    } catch (error) {
      results[service.name] = {
        name: service.name,
        port: service.port,
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
      
      console.log(`✗ ${service.name}:${service.port} - error: ${error.message}`);
    }
  }
  
  serviceStatus = results;
  lastCheck = new Date().toISOString();
  
  // Calcul du statut global
  const allUp = Object.values(results).every(service => service.status === 'up');
  const overallStatus = allUp ? 'healthy' : 'unhealthy';
  
  console.log(`Statut global: ${overallStatus}`);
  
  return {
    status: overallStatus,
    services: results,
    lastCheck,
    summary: {
      total: services.length,
      up: Object.values(results).filter(s => s.status === 'up').length,
      down: Object.values(results).filter(s => s.status === 'down').length,
      error: Object.values(results).filter(s => s.status === 'error').length
    }
  };
};

// Vérifications détaillées du système
const getSystemHealth = async () => {
  const health = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {}
  };
  
  try {
    // Utilisation CPU
    const { stdout: loadavg } = await exec('cat /proc/loadavg');
    health.system.loadAverage = loadavg.trim().split(' ').slice(0, 3).map(parseFloat);
  } catch (error) {
    health.system.loadAverage = null;
  }
  
  try {
    // Utilisation mémoire
    const { stdout: meminfo } = await exec('cat /proc/meminfo | head -3');
    const memLines = meminfo.split('\n');
    const memTotal = parseInt(memLines[0].match(/\d+/)[0]) * 1024;
    const memFree = parseInt(memLines[1].match(/\d+/)[0]) * 1024;
    const memAvailable = parseInt(memLines[2].match(/\d+/)[0]) * 1024;
    
    health.system.memory = {
      total: memTotal,
      free: memFree,
      available: memAvailable,
      used: memTotal - memFree,
      usagePercent: ((memTotal - memAvailable) / memTotal * 100).toFixed(2)
    };
  } catch (error) {
    health.system.memory = null;
  }
  
  try {
    // Espace disque
    const { stdout: df } = await exec('df -h / | tail -1');
    const diskInfo = df.trim().split(/\s+/);
    health.system.disk = {
      filesystem: diskInfo[0],
      size: diskInfo[1],
      used: diskInfo[2],
      available: diskInfo[3],
      usagePercent: diskInfo[4]
    };
  } catch (error) {
    health.system.disk = null;
  }
  
  return health;
};

// Routes API

// Health check principal
app.get('/health', async (req, res) => {
  const healthData = await checkServices();
  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(healthData);
});

// Health check simple (pour les load balancers)
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Statut détaillé
app.get('/status', async (req, res) => {
  const [servicesHealth, systemHealth] = await Promise.all([
    checkServices(),
    getSystemHealth()
  ]);
  
  res.json({
    ...servicesHealth,
    system: systemHealth
  });
});

// Statut d'un service spécifique
app.get('/status/:service', (req, res) => {
  const serviceName = req.params.service;
  const service = serviceStatus[serviceName];
  
  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: Object.keys(serviceStatus)
    });
  }
  
  const statusCode = service.status === 'up' ? 200 : 503;
  res.status(statusCode).json(service);
});

// Métriques Prometheus
app.get('/metrics', async (req, res) => {
  const healthData = await checkServices();
  let metrics = [];
  
  // Métrique de statut global
  metrics.push(`# HELP healthcheck_status Overall system health status (1=healthy, 0=unhealthy)`);
  metrics.push(`# TYPE healthcheck_status gauge`);
  metrics.push(`healthcheck_status ${healthData.status === 'healthy' ? 1 : 0}`);
  
  // Métriques par service
  metrics.push(`# HELP healthcheck_service_up Service availability (1=up, 0=down)`);
  metrics.push(`# TYPE healthcheck_service_up gauge`);
  
  metrics.push(`# HELP healthcheck_service_response_time Service response time in milliseconds`);
  metrics.push(`# TYPE healthcheck_service_response_time gauge`);
  
  Object.values(healthData.services).forEach(service => {
    const labels = `{service="${service.name}",port="${service.port}"}`;
    metrics.push(`healthcheck_service_up${labels} ${service.status === 'up' ? 1 : 0}`);
    
    if (service.responseTime !== undefined) {
      metrics.push(`healthcheck_service_response_time${labels} ${service.responseTime}`);
    }
  });
  
  // Métriques système
  const systemHealth = await getSystemHealth();
  if (systemHealth.system.memory) {
    metrics.push(`# HELP healthcheck_memory_usage_percent Memory usage percentage`);
    metrics.push(`# TYPE healthcheck_memory_usage_percent gauge`);
    metrics.push(`healthcheck_memory_usage_percent ${systemHealth.system.memory.usagePercent}`);
  }
  
  if (systemHealth.system.loadAverage) {
    metrics.push(`# HELP healthcheck_load_average System load average`);
    metrics.push(`# TYPE healthcheck_load_average gauge`);
    metrics.push(`healthcheck_load_average{period="1m"} ${systemHealth.system.loadAverage[0]}`);
    metrics.push(`healthcheck_load_average{period="5m"} ${systemHealth.system.loadAverage[1]}`);
    metrics.push(`healthcheck_load_average{period="15m"} ${systemHealth.system.loadAverage[2]}`);
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n') + '\n');
});

// Endpoint de configuration
app.get('/config', (req, res) => {
  res.json({
    checkInterval,
    services: services.map(s => ({ name: s.name, port: s.port })),
    lastCheck,
    uptime: process.uptime()
  });
});

// Middleware de gestion d'erreurs
app.use((error, req, res, next) => {
  console.error('Erreur:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Démarrage du serveur
const server = app.listen(port, () => {
  console.log(`Health check service démarré sur le port ${port}`);
  console.log(`Services surveillés: ${services.map(s => `${s.name}:${s.port}`).join(', ')}`);
  console.log(`Intervalle de vérification: ${checkInterval}s`);
  
  // Première vérification
  checkServices();
});

// Vérifications périodiques
const intervalId = setInterval(checkServices, checkInterval * 1000);

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  console.log('Arrêt du service de health check...');
  clearInterval(intervalId);
  server.close(() => {
    console.log('Service arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Interruption reçue, arrêt du service...');
  clearInterval(intervalId);
  server.close(() => {
    console.log('Service arrêté');
    process.exit(0);
  });
});

module.exports = app;