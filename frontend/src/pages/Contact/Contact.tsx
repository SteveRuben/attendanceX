// src/pages/Contact/Contact.tsx - Page de contact
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  ArrowRight, 
  Clock, 
  Users, 
  Headphones,
  MapPin,
  Star,
  Send,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';
import Footer from '@/components/layout/Footer';

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: 'general',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      detail: "support@attendancex.com",
      response: "24-48 hours",
      color: "bg-gray-100 text-gray-700"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Talk to our team",
      detail: "+1 (555) 123-4567",
      response: "Business hours",
      color: "bg-green-50 text-green-600"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with us live",
      detail: "Available on website",
      response: "Usually < 5 min",
      color: "bg-purple-50 text-purple-600"
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData);
    
    setIsSubmitting(false);
    // Reset form or show success message
  };

  const offices = [
    {
      city: "San Francisco",
      address: "123 Tech Street, Suite 100",
      timezone: "PST (UTC-8)"
    },
    {
      city: "New York",
      address: "456 Business Ave, Floor 20",
      timezone: "EST (UTC-5)"
    },
    {
      city: "London",
      address: "789 Innovation Road, Office 5",
      timezone: "GMT (UTC+0)"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-60"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300">
              <Star className="w-4 h-4 mr-2" />
              Get in Touch
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              We're here to
              <br />
              <span className="bg-gradient-to-r from-gray-800 to-purple-600 bg-clip-text text-transparent">
                help you succeed
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Have questions about AttendanceX? Need help getting started? 
              Our team is ready to assist you every step of the way.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { value: "< 5min", label: "Response Time", icon: Clock },
                { value: "500+", label: "Happy Customers", icon: Users },
                { value: "24/7", label: "Support Available", icon: Headphones },
                { value: "99.9%", label: "Customer Satisfaction", icon: Star }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <stat.icon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              Contact Options
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Choose how you'd like to
              <span className="text-purple-600"> reach us</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Multiple ways to get in touch with our support team
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <Card key={index} className="group bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-6">
                  <div className={`w-16 h-16 rounded-full ${method.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <method.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-xl text-gray-900 group-hover:text-purple-600 transition-colors">
                    {method.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-4 leading-relaxed">{method.description}</p>
                  <p className="font-semibold text-gray-900 mb-3 text-lg">{method.detail}</p>
                  <div className="flex items-center justify-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Response: {method.response}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              Contact Form
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Send us a
              <span className="text-purple-600"> message</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fill out the form below and we'll get back to you as soon as possible
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl text-gray-900">Get in touch</CardTitle>
                <p className="text-gray-600">
                  We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First name *
                      </label>
                      <Input 
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="John"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last name *
                      </label>
                      <Input 
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Doe"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@company.com"
                      className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <Input 
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Your company name"
                      className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                      <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="sales">Sales Question</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea 
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Tell us more about your needs..."
                      rows={5}
                      className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-gray-800 to-purple-600 text-white hover:from-gray-900 hover:to-purple-700 font-medium text-lg py-3 shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Company Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Company Information
                </h3>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="text-center p-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-gray-700" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">500+</div>
                      <div className="text-sm text-gray-700">Organizations</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="text-center p-6">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-900 mb-1">99.9%</div>
                      <div className="text-sm text-green-700">Uptime</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Offices */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                  Our Offices
                </h4>
                <div className="space-y-4">
                  {offices.map((office, index) => (
                    <Card key={index} className="bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-gray-900 mb-1">{office.city}</h5>
                        <p className="text-gray-600 text-sm mb-1">{office.address}</p>
                        <p className="text-gray-500 text-xs">{office.timezone}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* Support Hours */}
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-purple-900">Support Hours</h4>
                  </div>
                  <div className="space-y-2 text-sm text-purple-800">
                    <p><span className="font-medium">Monday - Friday:</span> 9:00 AM - 6:00 PM PST</p>
                    <p><span className="font-medium">Weekend:</span> Emergency support only</p>
                    <p><span className="font-medium">Response time:</span> Usually within 24 hours</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-800 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prefer to get started right away?
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
            Sign up for a free account and start tracking attendance today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-white text-gray-800 hover:bg-gray-100 font-medium text-lg px-8 py-4 shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/features')}
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white font-medium text-lg px-8 py-4"
            >
              View Features
            </Button>
          </div>
          <p className="text-purple-100 text-sm mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;