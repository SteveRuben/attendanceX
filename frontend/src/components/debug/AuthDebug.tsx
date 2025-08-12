import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/use-auth';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthDebug: React.FC = () => {
  const { user, session, isAuthenticated, loading } = useAuth();
  const [storageInfo, setStorageInfo] = useState(authService.getStorageInfo());
  const [sessionTest, setSessionTest] = useState<any>(null);
  const [showTokens, setShowTokens] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDebugInfo = async () => {
    const storage = authService.getStorageInfo();
    setStorageInfo(storage);

    const test = await authService.testSession();
    setSessionTest(test);
  };

  useEffect(() => {
    loadDebugInfo();
    
    const interval = setInterval(() => {
      setStorageInfo(authService.getStorageInfo());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDebugInfo();
    setRefreshing(false);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Quick Status */}
      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-blue-800">🔍 Auth Debug Panel</h3>
          <Button onClick={handleRefresh} disabled={refreshing} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(isAuthenticated)}
            <span className="text-sm font-medium">
              {isAuthenticated ? 'Authenticated' : 'Not Auth'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(!!user)}
            <span className="text-sm font-medium">
              {user ? 'User Data' : 'No User'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(!!session)}
            <span className="text-sm font-medium">
              {session ? 'Session' : 'No Session'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(!loading)}
            <span className="text-sm font-medium">
              {loading ? 'Loading...' : 'Ready'}
            </span>
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {sessionTest?.error && (
        <Card className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-bold text-red-800">Authentication Issue</h4>
          </div>
          <p className="text-red-700 text-sm mb-3">{sessionTest.error}</p>
          
          {sessionTest.sessionResponse && (
            <div className="mb-3">
              <p className="text-sm font-medium text-red-800 mb-1">API Response:</p>
              <pre className="bg-red-100 border border-red-300 p-2 rounded text-xs overflow-x-auto">
                {formatJson(sessionTest.sessionResponse)}
              </pre>
            </div>
          )}
          
          <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
            <p className="text-sm font-medium text-yellow-800 mb-1">Solutions:</p>
            <ul className="text-xs text-yellow-700 list-disc list-inside">
              <li>Check if backend API is running on port 5001</li>
              <li>Verify API endpoint URL is correct</li>
              <li>Try logging out and back in</li>
              <li>Clear browser storage if needed</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Storage Info */}
      <Card className="p-4 bg-gray-50 border-2 border-gray-200">
        <h4 className="font-bold mb-3">💾 Storage Information</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <strong>Remember Me:</strong>
            <Badge variant={storageInfo.rememberMe ? "default" : "secondary"}>
              {storageInfo.rememberMe ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <strong>Remembered Email:</strong> {storageInfo.rememberedEmail || 'None'}
          </div>
          <div className="flex items-center space-x-2">
            <strong>LocalStorage:</strong>
            <Badge variant={storageInfo.hasLocalStorageTokens ? "default" : "secondary"}>
              {storageInfo.hasLocalStorageTokens ? 'Has Tokens' : 'No Tokens'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <strong>SessionStorage:</strong>
            <Badge variant={storageInfo.hasSessionStorageTokens ? "default" : "secondary"}>
              {storageInfo.hasSessionStorageTokens ? 'Has Tokens' : 'No Tokens'}
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 border-t pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <strong className="text-sm">Current Tokens:</strong>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokens(!showTokens)}
            >
              {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTokens ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showTokens && (
            <pre className="bg-white border p-2 rounded text-xs overflow-x-auto">
              {formatJson(storageInfo.currentTokens)}
            </pre>
          )}
        </div>
      </Card>

      {/* Session Test */}
      {sessionTest && (
        <Card className="p-4 bg-green-50 border-2 border-green-200">
          <h4 className="font-bold mb-3">🔗 API Session Test</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              {getStatusIcon(sessionTest.hasTokens)}
              <strong>Has Tokens:</strong> {sessionTest.hasTokens ? 'Yes' : 'No'}
            </div>
            
            {sessionTest.sessionResponse && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusIcon(sessionTest.sessionResponse.success)}
                  <strong>Session API Response:</strong>
                  <Badge variant={sessionTest.sessionResponse.success ? "default" : "destructive"}>
                    {sessionTest.sessionResponse.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                <pre className="bg-white border p-2 rounded text-xs overflow-x-auto">
                  {formatJson(sessionTest.sessionResponse)}
                </pre>
              </div>
            )}
            
            {sessionTest.userProfileResponse && (
              <div className="mt-3">
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusIcon(sessionTest.userProfileResponse.success)}
                  <strong>User Profile API Response:</strong>
                  <Badge variant={sessionTest.userProfileResponse.success ? "default" : "destructive"}>
                    {sessionTest.userProfileResponse.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                <pre className="bg-white border p-2 rounded text-xs overflow-x-auto">
                  {formatJson(sessionTest.userProfileResponse)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-4 bg-purple-50 border-2 border-purple-200">
        <h4 className="font-bold mb-3">⚡ Debug Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('🔍 Auth Debug Info:', {
                user,
                session,
                isAuthenticated,
                loading,
                storageInfo,
                sessionTest
              });
            }}
          >
            Log to Console
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              authService.logout();
              window.location.reload();
            }}
          >
            Force Logout
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
          >
            Clear Storage
          </Button>
        </div>
      </Card>

      {/* Expected Behavior */}
      <Card className="p-4 bg-yellow-50 border-2 border-yellow-200">
        <h4 className="font-bold mb-2">📋 Expected Behavior</h4>
        <div className="text-xs text-gray-700">
          <ul className="list-disc list-inside space-y-1">
            <li>If "Remember Me" checked: tokens in localStorage</li>
            <li>If "Remember Me" unchecked: tokens in sessionStorage</li>
            <li>Email saved only if "Remember Me" is checked</li>
            <li>API should return user data in session response</li>
            <li>If API returns {`{success: true, data: null}`}, user is authenticated but no user data</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};