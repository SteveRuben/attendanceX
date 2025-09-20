// src/components/enhanced/InteractiveDemo.tsx
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { QrCode, MapPin, Fingerprint, Clock } from "lucide-react";

export default function InteractiveDemo() {
  return (
    <section className="section-padding bg-gray-900/30">
      <div className="container-nexa">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              See AttendanceX in Action
            </h2>
            <p className="text-xl text-gray-400">
              Try our different attendance tracking methods
            </p>
          </div>

          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="geo" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Geolocation
              </TabsTrigger>
              <TabsTrigger value="bio" className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" />
                Biometric
              </TabsTrigger>
              <TabsTrigger value="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time-based
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-8">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <Badge className="mb-4">Ultra-Fast Scanning</Badge>
                      <h3 className="text-2xl font-bold text-white mb-4">
                        QR Code Attendance
                      </h3>
                      <p className="text-gray-400 mb-6">
                        Generate unique QR codes for events with built-in security. 
                        Sub-second scanning with offline capability.
                      </p>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li>• Secure encrypted QR codes</li>
                        <li>• Works offline</li>
                        <li>• Bulk import participants</li>
                        <li>• Real-time updates</li>
                      </ul>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                      <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-gray-900" />
                      </div>
                      <p className="text-gray-400 mt-4">Interactive QR Demo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Autres onglets... */}
          </Tabs>
        </div>
      </div>
    </section>
  );
}