// src/pages/Contact/Contact.tsx - Page de contact
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, ArrowRight, Clock, Users, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';

const Contact: React.FC = () => {
  const navigate = useNavigate();

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      detail: "support@attendancex.com",
      response: "24-48 hours"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Talk to our team",
      detail: "+1 (555) 123-4567",
      response: "Business hours"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with us live",
      detail: "Available on website",
      response: "Usually < 5 min"
    }
  ];

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
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm bg-gray-100 text-gray-700">
            Get in Touch
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            We're here to help
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Have questions about AttendanceX? Need help getting started? 
            Our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose how you'd like to reach us
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <Card key={index} className="bg-white border-gray-200 hover:shadow-md transition-all duration-300 text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <method.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">{method.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{method.description}</p>
                  <p className="font-semibold text-gray-900 mb-2">{method.detail}</p>
                  <p className="text-sm text-gray-500">Response time: {method.response}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Send us a message
              </h2>
              <p className="text-gray-600 mb-8">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
              
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First name
                    </label>
                    <Input 
                      placeholder="John"
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last name
                    </label>
                    <Input 
                      placeholder="Doe"
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input 
                    type="email"
                    placeholder="john@company.com"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <Input 
                    placeholder="Your company name"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <Input 
                    placeholder="How can we help you?"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <Textarea 
                    placeholder="Tell us more about your needs..."
                    rows={5}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  Send message
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
            
            {/* Company Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Company information
              </h2>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Users className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">Organizations</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
              
              {/* Offices */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Our offices</h3>
              <div className="space-y-4 mb-8">
                {offices.map((office, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1">{office.city}</h4>
                    <p className="text-gray-600 text-sm mb-1">{office.address}</p>
                    <p className="text-gray-500 text-xs">{office.timezone}</p>
                  </div>
                ))}
              </div>
              
              {/* Support Hours */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-gray-700" />
                  <h4 className="font-semibold text-gray-900">Support Hours</h4>
                </div>
                <p className="text-sm text-gray-600 mb-1">Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                <p className="text-sm text-gray-600">Weekend: Emergency support only</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Prefer to get started right away?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Sign up for a free account and start tracking attendance today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/features')}
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-white"
            >
              View features
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;