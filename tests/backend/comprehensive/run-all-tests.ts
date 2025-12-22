/**
 * Script pour exécuter tous les tests complets du backend
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

interface TestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  results: TestResult[];
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Démarrage des tests complets du backend...\n');
    this.startTime = Date.now();

    const testSuites = [
      {
        name: 'Authentication System',
        file: 'auth.comprehensive.test.ts',
        description: 'Tests complets du système d\'authentification'
      },
      {
        name: 'User Invitations System',
        file: 'user-invitations.comprehensive.test.ts',
        description: 'Tests complets du système d\'invitations utilisateurs'
      },
      {
        name: 'Tenant Management System',
        file: 'tenant-management.comprehensive.test.ts',
        description: 'Tests complets du système de gestion des tenants'
      },
      {
        name: 'Events and Attendance System',
        file: 'events-attendance.comprehensive.test.ts',
        description: 'Tests complets du système d\'événements et de présence'
      },
      {
        name: 'API Integration',
        file: 'api-integration.comprehensive.test.ts',
        description: 'Tests d\'intégration complète de l\'API'
      }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    return this.generateSummary();
  }

  private async runTestSuite(suite: { name: string; file: string; description: string }): Promise<void> {
    console.log(`📋 Exécution: ${suite.name}`);
    console.log(`   ${suite.description}`);
    
    const startTime = Date.now();
    
    try {
      const command = `npm test -- --testPathPattern=${suite.file} --verbose --coverage --json --outputFile=test-results-${suite.file}.json`;
      
      const output = execSync(command, {
        cwd: path.join(__dirname, '../../../'),
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      const result = this.parseTestOutput(output, suite.name, duration);
      this.results.push(result);

      console.log(`   ✅ Terminé en ${duration}ms`);
      console.log(`   📊 ${result.passed} réussis, ${result.failed} échoués, ${result.skipped} ignorés\n`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ Échec en ${duration}ms`);
      console.log(`   🔍 Erreur: ${error.message}\n`);

      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration
      });
    }
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestResult {
    try {
      // Essayer de parser la sortie JSON de Jest
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const testResults = JSON.parse(jsonLine);
        
        return {
          suite: suiteName,
          passed: testResults.numPassedTests || 0,
          failed: testResults.numFailedTests || 0,
          skipped: testResults.numPendingTests || 0,
          duration,
          coverage: testResults.coverageMap ? {
            lines: testResults.coverageMap.getCoverageSummary?.().lines.pct || 0,
            functions: testResults.coverageMap.getCoverageSummary?.().functions.pct || 0,
            branches: testResults.coverageMap.getCoverageSummary?.().branches.pct || 0,
            statements: testResults.coverageMap.getCoverageSummary?.().statements.pct || 0
          } : undefined
        };
      }
    } catch (error) {
      console.warn(`Impossible de parser la sortie JSON pour ${suiteName}`);
    }

    // Fallback: parser la sortie texte
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    const skippedMatch = output.match(/(\d+) pending/);

    return {
      suite: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration
    };
  }

  private generateSummary(): TestSummary {
    const totalDuration = Date.now() - this.startTime;
    
    const summary: TestSummary = {
      totalSuites: this.results.length,
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration,
      results: this.results
    };

    // Calculer la couverture globale si disponible
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      summary.overallCoverage = {
        lines: coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length,
        functions: coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length,
        branches: coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length,
        statements: coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length
      };
    }

    return summary;
  }

  generateReport(summary: TestSummary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT DE TESTS COMPLETS DU BACKEND');
    console.log('='.repeat(80));
    
    console.log(`\n📈 RÉSUMÉ GLOBAL:`);
    console.log(`   Suites de tests: ${summary.totalSuites}`);
    console.log(`   Tests totaux: ${summary.totalTests}`);
    console.log(`   ✅ Réussis: ${summary.totalPassed}`);
    console.log(`   ❌ Échoués: ${summary.totalFailed}`);
    console.log(`   ⏭️  Ignorés: ${summary.totalSkipped}`);
    console.log(`   ⏱️  Durée totale: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    
    const successRate = summary.totalTests > 0 ? (summary.totalPassed / summary.totalTests * 100).toFixed(1) : '0';
    console.log(`   📊 Taux de réussite: ${successRate}%`);

    if (summary.overallCoverage) {
      console.log(`\n📋 COUVERTURE DE CODE:`);
      console.log(`   Lignes: ${summary.overallCoverage.lines.toFixed(1)}%`);
      console.log(`   Fonctions: ${summary.overallCoverage.functions.toFixed(1)}%`);
      console.log(`   Branches: ${summary.overallCoverage.branches.toFixed(1)}%`);
      console.log(`   Instructions: ${summary.overallCoverage.statements.toFixed(1)}%`);
    }

    console.log(`\n📝 DÉTAILS PAR SUITE:`);
    summary.results.forEach(result => {
      const status = result.failed > 0 ? '❌' : '✅';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`   ${status} ${result.suite}`);
      console.log(`      Tests: ${result.passed + result.failed + result.skipped} (${result.passed}✅ ${result.failed}❌ ${result.skipped}⏭️)`);
      console.log(`      Durée: ${duration}s`);
      
      if (result.coverage) {
        console.log(`      Couverture: ${result.coverage.lines.toFixed(1)}% lignes, ${result.coverage.functions.toFixed(1)}% fonctions`);
      }
    });

    // Recommandations
    console.log(`\n💡 RECOMMANDATIONS:`);
    
    if (summary.totalFailed > 0) {
      console.log(`   🔧 ${summary.totalFailed} test(s) ont échoué - Vérifiez les logs pour plus de détails`);
    }
    
    if (summary.overallCoverage && summary.overallCoverage.lines < 80) {
      console.log(`   📈 Couverture de code faible (${summary.overallCoverage.lines.toFixed(1)}%) - Ajoutez plus de tests`);
    }
    
    if (summary.totalSkipped > 0) {
      console.log(`   ⚠️  ${summary.totalSkipped} test(s) ignoré(s) - Considérez les activer`);
    }

    const slowSuites = summary.results.filter(r => r.duration > 30000);
    if (slowSuites.length > 0) {
      console.log(`   🐌 Suite(s) lente(s) détectée(s): ${slowSuites.map(s => s.suite).join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
    
    // Sauvegarder le rapport
    this.saveReport(summary);
  }

  private saveReport(summary: TestSummary): void {
    const reportDir = path.join(__dirname, '../../../test-results/backend');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Rapport JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    fs.writeFileSync(
      path.join(reportDir, 'comprehensive-test-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Rapport HTML simple
    const htmlReport = this.generateHtmlReport(summary);
    fs.writeFileSync(
      path.join(reportDir, 'comprehensive-test-report.html'),
      htmlReport
    );

    console.log(`📄 Rapports sauvegardés dans: ${reportDir}`);
  }

  private generateHtmlReport(summary: TestSummary): string {
    const successRate = summary.totalTests > 0 ? (summary.totalPassed / summary.totalTests * 100).toFixed(1) : '0';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Rapport de Tests Backend - AttendanceX</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .suite { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .suite.passed { border-left: 4px solid #28a745; }
        .suite.failed { border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Rapport de Tests Complets - Backend AttendanceX</h1>
        <p>Généré le: ${new Date().toLocaleString()}</p>
        <p>Durée totale: ${(summary.totalDuration / 1000).toFixed(2)} secondes</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Taux de Réussite</h3>
            <div class="value ${parseFloat(successRate) >= 90 ? 'success' : parseFloat(successRate) >= 70 ? 'warning' : 'danger'}">${successRate}%</div>
        </div>
        <div class="metric">
            <h3>Tests Réussis</h3>
            <div class="value success">${summary.totalPassed}</div>
        </div>
        <div class="metric">
            <h3>Tests Échoués</h3>
            <div class="value danger">${summary.totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Tests Ignorés</h3>
            <div class="value warning">${summary.totalSkipped}</div>
        </div>
    </div>

    ${summary.overallCoverage ? `
    <div class="summary">
        <div class="metric">
            <h3>Couverture Lignes</h3>
            <div class="value ${summary.overallCoverage.lines >= 80 ? 'success' : summary.overallCoverage.lines >= 60 ? 'warning' : 'danger'}">${summary.overallCoverage.lines.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Couverture Fonctions</h3>
            <div class="value ${summary.overallCoverage.functions >= 80 ? 'success' : summary.overallCoverage.functions >= 60 ? 'warning' : 'danger'}">${summary.overallCoverage.functions.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Couverture Branches</h3>
            <div class="value ${summary.overallCoverage.branches >= 80 ? 'success' : summary.overallCoverage.branches >= 60 ? 'warning' : 'danger'}">${summary.overallCoverage.branches.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Couverture Instructions</h3>
            <div class="value ${summary.overallCoverage.statements >= 80 ? 'success' : summary.overallCoverage.statements >= 60 ? 'warning' : 'danger'}">${summary.overallCoverage.statements.toFixed(1)}%</div>
        </div>
    </div>
    ` : ''}

    <h2>📝 Détails par Suite de Tests</h2>
    ${summary.results.map(result => `
        <div class="suite ${result.failed > 0 ? 'failed' : 'passed'}">
            <h3>${result.failed > 0 ? '❌' : '✅'} ${result.suite}</h3>
            <p><strong>Tests:</strong> ${result.passed + result.failed + result.skipped} total (${result.passed} réussis, ${result.failed} échoués, ${result.skipped} ignorés)</p>
            <p><strong>Durée:</strong> ${(result.duration / 1000).toFixed(2)} secondes</p>
            ${result.coverage ? `
                <p><strong>Couverture:</strong> 
                   Lignes: ${result.coverage.lines.toFixed(1)}%, 
                   Fonctions: ${result.coverage.functions.toFixed(1)}%, 
                   Branches: ${result.coverage.branches.toFixed(1)}%, 
                   Instructions: ${result.coverage.statements.toFixed(1)}%
                </p>
            ` : ''}
        </div>
    `).join('')}

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Rapport généré par le système de tests AttendanceX Backend</p>
    </footer>
</body>
</html>`;
  }
}

// Exécution du script
async function main() {
  const runner = new TestRunner();
  
  try {
    const summary = await runner.runAllTests();
    runner.generateReport(summary);
    
    // Code de sortie basé sur les résultats
    const exitCode = summary.totalFailed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  }
}

// Exécuter seulement si ce fichier est appelé directement
if (require.main === module) {
  main();
}

export { TestRunner };