/**
 * Script de test pour les APIs d'authentification
 */

import * as dotenv from "dotenv";
dotenv.config();

const API_BASE_URL = "http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  corsHeaders?: Record<string, string>;
}

class AuthAPITester {
  private results: TestResult[] = [];

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(
    endpoint: string, 
    method: string = 'GET', 
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<TestResult> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Accept': 'application/json',
      ...headers
    };

    console.log(`\n🔍 Testing ${method} ${endpoint}`);
    console.log(`📡 URL: ${url}`);
    
    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      // Extract CORS headers
      const corsHeaders: Record<string, string> = {};
      ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-credentials'].forEach(header => {
        const value = response.headers.get(header);
        if (value) corsHeaders[header] = value;
      });

      const result: TestResult = {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        data,
        corsHeaders
      };

      console.log(`📊 Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
      console.log(`🌐 CORS Headers:`, corsHeaders);
      
      if (data) {
        console.log(`📄 Response:`, typeof data === 'string' ? data.substring(0, 200) : data);
      }

      this.results.push(result);
      return result;

    } catch (error) {
      const result: TestResult = {
        endpoint,
        method,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      console.log(`❌ Error: ${result.error}`);
      this.results.push(result);
      return result;
    }
  }

  async testHealthEndpoint(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🏥 Testing Health Endpoint");
    console.log("=".repeat(60));
    
    await this.makeRequest('/health');
  }

  async testRegisterEndpoint(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("📝 Testing Register Endpoint");
    console.log("=".repeat(60));

    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: "Password123!",
      firstName: "John",
      lastName: "Doe",
      role: "user"
    };

    await this.makeRequest('/auth/register', 'POST', testUser);
    
    // Wait to avoid rate limiting
    console.log("⏳ Waiting 5 seconds to avoid rate limiting...");
    await this.delay(5000);
  }

  async testLoginEndpoint(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 Testing Login Endpoint");
    console.log("=".repeat(60));

    const loginData = {
      email: "test@example.com",
      password: "Password123!"
    };

    await this.makeRequest('/auth/login', 'POST', loginData);
    
    // Wait to avoid rate limiting
    console.log("⏳ Waiting 5 seconds to avoid rate limiting...");
    await this.delay(5000);
  }

  async testCorsPreflightRegister(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🌐 Testing CORS Preflight for Register");
    console.log("=".repeat(60));

    await this.makeRequest('/auth/register', 'OPTIONS', undefined, {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    });
  }

  async testCorsPreflightLogin(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🌐 Testing CORS Preflight for Login");
    console.log("=".repeat(60));

    await this.makeRequest('/auth/login', 'OPTIONS', undefined, {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    });
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Authentication API Tests");
    console.log("🌐 Base URL:", API_BASE_URL);
    console.log("🕒 Started at:", new Date().toISOString());

    try {
      await this.testHealthEndpoint();
      await this.delay(2000);
      
      await this.testCorsPreflightRegister();
      await this.delay(2000);
      
      await this.testCorsPreflightLogin();
      await this.delay(2000);
      
      await this.testRegisterEndpoint();
      await this.testLoginEndpoint();
      
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }

    this.printSummary();
  }

  printSummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));

    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${total - successful}/${total}`);

    console.log("\n📋 Detailed Results:");
    this.results.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${index + 1}. ${status} ${result.method} ${result.endpoint} - ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.corsHeaders && Object.keys(result.corsHeaders).length > 0) {
        console.log(`   CORS: ${Object.keys(result.corsHeaders).length} headers present`);
      }
    });

    console.log("\n🎯 Key Findings:");
    
    // Check CORS
    const corsResults = this.results.filter(r => r.corsHeaders && Object.keys(r.corsHeaders).length > 0);
    if (corsResults.length > 0) {
      console.log("✅ CORS headers are present in responses");
    } else {
      console.log("⚠️  CORS headers might be missing");
    }

    // Check auth endpoints
    const authResults = this.results.filter(r => r.endpoint.includes('/auth/'));
    const authSuccessful = authResults.filter(r => r.success).length;
    
    if (authSuccessful > 0) {
      console.log(`✅ ${authSuccessful}/${authResults.length} auth endpoints responding`);
    } else {
      console.log("❌ Auth endpoints not working properly");
    }

    console.log("\n🕒 Completed at:", new Date().toISOString());
  }
}

// Run the tests
const tester = new AuthAPITester();
tester.runAllTests().catch(console.error);