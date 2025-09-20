// src/components/landing/FAQAccordion.tsx - Version thème clair simple
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowRight, Shield, Zap, Users, Settings, BarChart3, MessageCircle } from "lucide-react";

const faqCategories = [
  {
    category: "Getting Started",
    icon: Zap,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    faqs: [
      {
        question: "How quickly can I set up AttendanceX?",
        answer: "Setup takes less than 15 minutes. Create your account, configure your first event, and start tracking attendance immediately. Our onboarding wizard guides you through each step."
      },
      {
        question: "Do I need technical expertise to use AttendanceX?",
        answer: "No technical expertise required. AttendanceX is designed for HR professionals and managers. Our intuitive interface and drag-and-drop configuration make it accessible to everyone."
      }
    ]
  },
  {
    category: "Features & Accuracy",
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
        answer: "AttendanceX supports QR code scanning, GPS geofencing, biometric verification (fingerprint/facial recognition), manual check-ins, and time-based automatic tracking. All methods work across devices."
      }
    ]
  },
  {
    category: "Integration & Security",
    icon: Shield,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    faqs: [
      {
        question: "Can I integrate with my existing HR systems?",
        answer: "Yes, AttendanceX offers seamless integration with popular HR platforms including Workday, BambooHR, ADP, SAP SuccessFactors, and custom systems through our REST API and webhooks."
      },
      {
        question: "How secure is my data?",
        answer: "We use bank-grade encryption (AES-256) for data at rest and in transit. All data is stored in SOC 2 Type II compliant data centers with complete audit trails and GDPR compliance."
      }
    ]
  },
  {
    category: "Device Support",
    icon: Users,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    faqs: [
      {
        question: "What devices are supported?",
        answer: "AttendanceX works on any device with a web browser or our mobile apps (iOS/Android). Support includes smartphones, tablets, kiosks, desktop computers, and even IoT devices."
      },
      {
        question: "Does it work offline?",
        answer: "Yes, our mobile apps support offline attendance marking. Data automatically syncs when connectivity is restored, ensuring no attendance records are lost."
      }
    ]
  },
  {
    category: "Customization",
    icon: Settings,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    faqs: [
      {
        question: "Can I customize attendance rules?",
        answer: "Absolutely! Configure custom attendance policies, grace periods, overtime rules, break requirements, geofencing parameters, and approval workflows to match your organization's specific needs."
      },
      {
        question: "Is white-label branding available?",
        answer: "Yes, Enterprise plans include full white-label customization with your company logo, colors, and branding throughout the platform and mobile apps."
      }
    ]
  }
];

export default function FAQAccordion() {
  return (
    <section className="section-padding bg-white relative">
      {/* Background Elements subtils */}
      <div className="absolute inset-0 bg-white"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-30"></div>
      
      <div className="container-nexa relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm bg-gray-100 border-gray-200">
            <MessageCircle className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </Badge>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
            Everything you need to know
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about AttendanceX features, setup, and best practices
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {faqCategories.map((category, categoryIndex) => (
              <Card 
                key={categoryIndex}
                className="bg-gray-50 border-gray-200 hover:border-gray-300 transition-all duration-300 shadow-sm animate-fade-in"
                style={{animationDelay: `${categoryIndex * 0.1}s`}}
              >
                <CardContent className="p-6">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.category}
                    </h3>
                  </div>

                  {/* FAQ Accordion */}
                  <Accordion type="single" collapsible className="space-y-3">
                    {category.faqs.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`item-${categoryIndex}-${faqIndex}`}
                        className="border border-gray-200 rounded-lg px-4 data-[state=open]:border-gray-300 data-[state=open]:bg-white transition-all duration-300"
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
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-gray-50 border-gray-200 shadow-sm">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Still have questions?
              </h3>
              <p className="text-gray-600 mb-6">
                Our support team is here to help you get the most out of AttendanceX
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  className="border-gray-300 hover:border-gray-400 bg-transparent hover:bg-gray-100 text-gray-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
                <Button className="bg-gray-900 text-white hover:bg-gray-800 border-0">
                  Schedule Demo Call
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              title: "Documentation",
              description: "Complete guides and API reference",
              icon: "📚",
              link: "#docs"
            },
            {
              title: "Video Tutorials",
              description: "Step-by-step video walkthroughs",
              icon: "🎥",
              link: "#tutorials"
            },
            {
              title: "Community Forum",
              description: "Connect with other AttendanceX users",
              icon: "💬",
              link: "#community"
            }
          ].map((resource, index) => (
            <Card 
              key={index}
              className="bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all duration-300 cursor-pointer group"
            >
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {resource.icon}
                </div>
                <h4 className="text-gray-900 font-medium mb-2 group-hover:text-gray-800 transition-colors">
                  {resource.title}
                </h4>
                <p className="text-gray-600 text-sm group-hover:text-gray-700 transition-colors">
                  {resource.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}