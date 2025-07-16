// src/pages/FAQ/FAQ.tsx - Page FAQ dédiée
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Shield, Zap, Users, Settings, BarChart3, MessageCircle, Search, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const faqCategories = [
    {
      category: "Getting Started",
      icon: Zap,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      faqs: [
        {
          question: "How quickly can I set up AttendanceX?",
          answer: "Setup takes less than 15 minutes. Create your account, configure your first event, and start tracking attendance immediately. Our onboarding wizard guides you through each step, from adding your first users to setting up your first event."
        },
        {
          question: "Do I need technical expertise to use AttendanceX?",
          answer: "No technical expertise required. AttendanceX is designed for HR professionals and managers. Our intuitive interface and drag-and-drop configuration make it accessible to everyone, regardless of technical background."
        },
        {
          question: "Can I import my existing user data?",
          answer: "Yes, you can easily import users via CSV upload or integrate with your existing HR systems. We support imports from Excel, CSV files, and direct integrations with popular HR platforms."
        },
        {
          question: "Is there a mobile app?",
          answer: "Yes, we offer native mobile apps for both iOS and Android. Users can mark attendance, view their history, and receive notifications directly on their mobile devices."
        }
      ]
    },
    {
      category: "Features & Tracking",
      icon: BarChart3,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      faqs: [
        {
          question: "How accurate is the attendance tracking?",
          answer: "Our smart system maintains 99.9% accuracy across all tracking methods including QR codes, geolocation, and biometrics. The system continuously learns and adapts to improve precision over time."
        },
        {
          question: "What tracking methods are supported?",
          answer: "AttendanceX supports QR code scanning, GPS geofencing, biometric verification (fingerprint/facial recognition), manual check-ins, and time-based automatic tracking. All methods work across devices and can be used simultaneously."
        },
        {
          question: "Can I track attendance for remote workers?",
          answer: "Absolutely! Remote workers can check in using the mobile app with GPS verification, QR codes, or manual check-ins. You can set flexible geofencing rules for different work locations."
        },
        {
          question: "How does the QR code system work?",
          answer: "Each event generates a unique QR code that users can scan with their mobile device. QR codes can be displayed on screens, printed, or shared digitally. They automatically expire after the event period for security."
        }
      ]
    },
    {
      category: "Security & Privacy",
      icon: Shield,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      faqs: [
        {
          question: "How secure is my data?",
          answer: "We use bank-grade encryption (AES-256) for data at rest and in transit. All data is stored in SOC 2 Type II compliant data centers with complete audit trails and GDPR compliance. We never share your data with third parties."
        },
        {
          question: "Is AttendanceX GDPR compliant?",
          answer: "Yes, AttendanceX is fully GDPR compliant. We provide data portability, right to deletion, and transparent privacy controls. Users can request their data or deletion at any time."
        },
        {
          question: "Can users see each other's attendance data?",
          answer: "No, individual attendance data is only visible to authorized administrators and the user themselves. We implement strict role-based access controls to protect privacy."
        },
        {
          question: "Where is my data stored?",
          answer: "Data is stored in secure, SOC 2 compliant data centers in the US and EU. You can choose your preferred data location during setup. All data is encrypted and regularly backed up."
        }
      ]
    },
    {
      category: "Integration & API",
      icon: Settings,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      faqs: [
        {
          question: "Can I integrate with my existing HR systems?",
          answer: "Yes, AttendanceX offers seamless integration with popular HR platforms including Workday, BambooHR, ADP, SAP SuccessFactors, and custom systems through our REST API and webhooks."
        },
        {
          question: "Do you provide an API?",
          answer: "Yes, we offer a comprehensive REST API that allows you to integrate AttendanceX with your existing systems. Full documentation and code examples are available for developers."
        },
        {
          question: "Can I export my data?",
          answer: "Absolutely! You can export attendance data in multiple formats including CSV, Excel, and PDF. Exports can be scheduled automatically or generated on-demand with custom date ranges and filters."
        },
        {
          question: "Does it work with Slack or Microsoft Teams?",
          answer: "Yes, we offer integrations with Slack and Microsoft Teams for notifications and quick attendance updates. Users can receive reminders and check attendance status directly in their collaboration tools."
        }
      ]
    },
    {
      category: "Billing & Support",
      icon: Users,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      faqs: [
        {
          question: "How does billing work?",
          answer: "Billing is based on the number of active users per month. You're only charged for users who actually use the system. Annual plans receive a 20% discount and we offer flexible payment terms for enterprise customers."
        },
        {
          question: "Can I change my plan anytime?",
          answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated. There are no cancellation fees or long-term contracts required."
        },
        {
          question: "What support do you offer?",
          answer: "We provide email support for all users, priority support for paid plans, and dedicated support for enterprise customers. Our average response time is under 2 hours during business hours."
        },
        {
          question: "Do you offer training or onboarding?",
          answer: "Yes! We provide free onboarding sessions for all new customers, comprehensive documentation, video tutorials, and live training sessions for enterprise clients."
        }
      ]
    }
  ];

  // Filter FAQs based on search term
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm bg-gray-100 text-gray-700">
            Help Center
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Find answers to common questions about AttendanceX features, setup, pricing, and more.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search FAQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search terms or browse all categories below.</p>
              <Button 
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="mt-4 border-gray-300 text-gray-700 hover:bg-white"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {filteredCategories.map((category, categoryIndex) => (
                <Card 
                  key={categoryIndex}
                  className="bg-white border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <CardContent className="p-6">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`p-2 rounded-lg ${category.bgColor}`}>
                        <category.icon className={`w-5 h-5 ${category.color}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {category.category}
                      </h2>
                    </div>

                    {/* FAQ Accordion */}
                    <Accordion type="single" collapsible className="space-y-3">
                      {category.faqs.map((faq, faqIndex) => (
                        <AccordionItem 
                          key={faqIndex} 
                          value={`item-${categoryIndex}-${faqIndex}`}
                          className="border border-gray-200 rounded-lg px-4 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50 transition-all duration-300"
                        >
                          <AccordionTrigger className="text-left text-gray-900 hover:text-gray-700 hover:no-underline py-4 text-sm font-medium">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-600 pb-4 text-sm leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/contact')}
              size="lg" 
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contact Support
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/register')}
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">
            Popular help topics
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Getting Started Guide",
                description: "Step-by-step setup instructions",
                icon: "🚀"
              },
              {
                title: "Mobile App Guide",
                description: "Using AttendanceX on mobile",
                icon: "📱"
              },
              {
                title: "Integrations",
                description: "Connect with your existing tools",
                icon: "🔗"
              }
            ].map((topic, index) => (
              <Card 
                key={index}
                className="bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-300 cursor-pointer"
              >
                <CardContent className="p-6 text-center">
                  <div className="text-2xl mb-3">{topic.icon}</div>
                  <h4 className="font-semibold text-gray-900 mb-2">{topic.title}</h4>
                  <p className="text-sm text-gray-600">{topic.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;