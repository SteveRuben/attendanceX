import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Code, 
  Book, 
  Server, 
  Key,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import { toast } from 'react-toastify';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  auth: boolean;
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  examples: ApiExample[];
}

interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description: string;
  example?: any;
}

interface ApiRequestBody {
  contentType: string;
  schema: any;
  example: any;
}

interface ApiResponse {
  status: number;
  description: string;
  schema?: any;
  example?: any;
}

interface ApiExample {
  title: string;
  request: any;
  response: any;
}

interface ApiInfo {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  contact: {
    name: string;
    email: string;
    url: string;
  };
  license: {
    name: string;
    url: string;
  };
}

const ApiReference = () => {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [filteredEndpoints, setFilteredEndpoints] = useState<ApiEndpoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiDocumentation();
  }, []);

  useEffect(() => {
    filterEndpoints();
  }, [searchTerm, selectedTag, endpoints]);

  const fetchApiDocumentation = async () => {
    try {
      // Simulate API documentation fetch
      const mockApiInfo: ApiInfo = {
        title: 'AttendanceX API',
        version: '2.0.0',
        description: 'Comprehensive API for attendance management with AI/ML capabilities, real-time analytics, and multi-channel notifications.',
        baseUrl: 'https://api.attendance-x.app/v1',
        contact: {
          name: 'AttendanceX Support',
          email: 'support@attendance-x.com',
          url: 'https://docs.attendance-x.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      };

      const mockEndpoints: ApiEndpoint[] = [
        // Auth endpoints
        {
          method: 'POST',
          path: '/auth/login',
          summary: 'User Login',
          description: 'Authenticate user with email and password',
          tags: ['Authentication'],
          auth: false,
          requestBody: {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                rememberMe: { type: 'boolean', default: false }
              },
              required: ['email', 'password']
            },
            example: {
              email: 'user@example.com',
              password: 'securePassword123',
              rememberMe: true
            }
          },
          responses: [
            {
              status: 200,
              description: 'Login successful',
              example: {
                success: true,
                data: {
                  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: {
                    id: 'user123',
                    email: 'user@example.com',
                    firstName: 'John',
                    lastName: 'Doe'
                  }
                }
              }
            },
            {
              status: 401,
              description: 'Invalid credentials',
              example: {
                success: false,
                error: 'Invalid email or password'
              }
            }
          ],
          examples: [
            {
              title: 'Standard Login',
              request: {
                email: 'user@example.com',
                password: 'password123'
              },
              response: {
                success: true,
                data: {
                  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: { id: 'user123', email: 'user@example.com' }
                }
              }
            }
          ]
        },
        {
          method: 'POST',
          path: '/auth/register',
          summary: 'User Registration',
          description: 'Register a new user account',
          tags: ['Authentication'],
          auth: false,
          requestBody: {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                organization: { type: 'string' }
              },
              required: ['email', 'password', 'firstName', 'lastName', 'organization']
            },
            example: {
              email: 'newuser@example.com',
              password: 'securePassword123',
              firstName: 'Jane',
              lastName: 'Smith',
              organization: 'Acme Corp'
            }
          },
          responses: [
            {
              status: 201,
              description: 'Registration successful',
              example: {
                success: true,
                message: 'Registration successful. Check your email for verification.',
                data: {
                  email: 'newuser@example.com',
                  verificationSent: true
                }
              }
            }
          ],
          examples: []
        },
        // Users endpoints
        {
          method: 'GET',
          path: '/users',
          summary: 'List Users',
          description: 'Get a paginated list of users with optional filtering',
          tags: ['Users'],
          auth: true,
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              type: 'integer',
              description: 'Page number (default: 1)',
              example: 1
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              type: 'integer',
              description: 'Items per page (default: 20, max: 100)',
              example: 20
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              type: 'string',
              description: 'Search term for name or email',
              example: 'john'
            },
            {
              name: 'role',
              in: 'query',
              required: false,
              type: 'string',
              description: 'Filter by user role',
              example: 'admin'
            }
          ],
          responses: [
            {
              status: 200,
              description: 'Users retrieved successfully',
              example: {
                success: true,
                data: {
                  users: [
                    {
                      id: 'user123',
                      email: 'user@example.com',
                      firstName: 'John',
                      lastName: 'Doe',
                      role: 'participant',
                      status: 'active'
                    }
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 150,
                    pages: 8
                  }
                }
              }
            }
          ],
          examples: []
        },
        // Events endpoints
        {
          method: 'POST',
          path: '/events',
          summary: 'Create Event',
          description: 'Create a new event',
          tags: ['Events'],
          auth: true,
          requestBody: {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                startDateTime: { type: 'string', format: 'date-time' },
                endDateTime: { type: 'string', format: 'date-time' },
                location: { type: 'object' },
                maxParticipants: { type: 'integer' }
              },
              required: ['title', 'startDateTime', 'endDateTime']
            },
            example: {
              title: 'Team Meeting',
              description: 'Weekly team sync meeting',
              startDateTime: '2024-01-15T10:00:00Z',
              endDateTime: '2024-01-15T11:00:00Z',
              location: {
                type: 'physical',
                address: '123 Main St, Conference Room A'
              },
              maxParticipants: 20
            }
          },
          responses: [
            {
              status: 201,
              description: 'Event created successfully',
              example: {
                success: true,
                data: {
                  id: 'event123',
                  title: 'Team Meeting',
                  startDateTime: '2024-01-15T10:00:00Z',
                  status: 'scheduled'
                }
              }
            }
          ],
          examples: []
        },
        // Attendance endpoints
        {
          method: 'POST',
          path: '/attendances/mark',
          summary: 'Mark Attendance',
          description: 'Mark attendance for an event',
          tags: ['Attendance'],
          auth: true,
          requestBody: {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                eventId: { type: 'string' },
                method: { type: 'string', enum: ['qr_code', 'geolocation', 'manual'] },
                location: { type: 'object' },
                notes: { type: 'string' }
              },
              required: ['eventId', 'method']
            },
            example: {
              eventId: 'event123',
              method: 'qr_code',
              location: {
                latitude: 40.7128,
                longitude: -74.0060
              },
              notes: 'Arrived on time'
            }
          },
          responses: [
            {
              status: 201,
              description: 'Attendance marked successfully',
              example: {
                success: true,
                data: {
                  id: 'attendance123',
                  eventId: 'event123',
                  userId: 'user123',
                  checkInTime: '2024-01-15T10:05:00Z',
                  method: 'qr_code',
                  status: 'present'
                }
              }
            }
          ],
          examples: []
        }
      ];

      setApiInfo(mockApiInfo);
      setEndpoints(mockEndpoints);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch API documentation:', error);
      toast.error('Failed to load API documentation');
      setLoading(false);
    }
  };

  const filterEndpoints = () => {
    let filtered = endpoints;

    if (searchTerm) {
      filtered = filtered.filter(endpoint =>
        endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter(endpoint =>
        endpoint.tags.includes(selectedTag)
      );
    }

    setFilteredEndpoints(filtered);
  };

  const toggleEndpoint = (path: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedEndpoints(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const allTags = ['all', ...Array.from(new Set(endpoints.flatMap(e => e.tags)))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading API documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Reference</h1>
          <p className="text-gray-600 mt-1">
            Complete documentation for the AttendanceX API
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Postman Collection
          </Button>
          <Button variant="outline" size="sm">
            <Code className="w-4 h-4 mr-2" />
            OpenAPI Spec
          </Button>
        </div>
      </div>

      {/* API Info */}
      {apiInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="w-5 h-5" />
              <span>{apiInfo.title}</span>
              <Badge variant="outline">v{apiInfo.version}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{apiInfo.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Base URL</p>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {apiInfo.baseUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(apiInfo.baseUrl)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Contact</p>
                <p className="text-sm mt-1">
                  <a href={`mailto:${apiInfo.contact.email}`} className="text-blue-600 hover:underline">
                    {apiInfo.contact.email}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">License</p>
                <p className="text-sm mt-1">
                  <a href={apiInfo.license.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    {apiInfo.license.name}
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search endpoints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-4">
        {filteredEndpoints.map((endpoint, index) => {
          const isExpanded = expandedEndpoints.has(endpoint.path);
          return (
            <Card key={index}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleEndpoint(endpoint.path)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={getMethodColor(endpoint.method)}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    <span className="font-medium">{endpoint.summary}</span>
                    {endpoint.auth && <Lock className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    {endpoint.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <p className="text-gray-600 mb-4">{endpoint.description}</p>
                  
                  <Tabs defaultValue="parameters" className="w-full">
                    <TabsList>
                      {endpoint.parameters && <TabsTrigger value="parameters">Parameters</TabsTrigger>}
                      {endpoint.requestBody && <TabsTrigger value="request">Request</TabsTrigger>}
                      <TabsTrigger value="responses">Responses</TabsTrigger>
                      {endpoint.examples.length > 0 && <TabsTrigger value="examples">Examples</TabsTrigger>}
                    </TabsList>
                    
                    {endpoint.parameters && (
                      <TabsContent value="parameters">
                        <div className="space-y-2">
                          {endpoint.parameters.map((param, i) => (
                            <div key={i} className="border rounded p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <code className="text-sm font-mono">{param.name}</code>
                                <Badge variant="outline" className="text-xs">{param.in}</Badge>
                                <Badge variant="outline" className="text-xs">{param.type}</Badge>
                                {param.required && <Badge variant="destructive" className="text-xs">required</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{param.description}</p>
                              {param.example && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500">Example:</p>
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {JSON.stringify(param.example)}
                                  </code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    )}
                    
                    {endpoint.requestBody && (
                      <TabsContent value="request">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Content-Type: {endpoint.requestBody.contentType}</p>
                            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                              <code>{JSON.stringify(endpoint.requestBody.example, null, 2)}</code>
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    )}
                    
                    <TabsContent value="responses">
                      <div className="space-y-4">
                        {endpoint.responses.map((response, i) => (
                          <div key={i} className="border rounded p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={response.status < 300 ? "default" : "destructive"}>
                                {response.status}
                              </Badge>
                              <span className="font-medium">{response.description}</span>
                            </div>
                            {response.example && (
                              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mt-2">
                                <code>{JSON.stringify(response.example, null, 2)}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {endpoint.examples.length > 0 && (
                      <TabsContent value="examples">
                        <div className="space-y-4">
                          {endpoint.examples.map((example, i) => (
                            <div key={i} className="border rounded p-4">
                              <h4 className="font-medium mb-3">{example.title}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium mb-2">Request</p>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                                    <code>{JSON.stringify(example.request, null, 2)}</code>
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2">Response</p>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                                    <code>{JSON.stringify(example.response, null, 2)}</code>
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredEndpoints.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No endpoints found matching your search criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Most endpoints require authentication. Include your API key in the Authorization header: 
          <code className="ml-1 bg-gray-100 px-2 py-1 rounded text-sm">Bearer YOUR_API_KEY</code>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ApiReference;