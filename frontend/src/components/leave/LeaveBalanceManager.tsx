/**
 * Gestionnaire des soldes de congés
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../components/ui';
import {
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Edit,
  RefreshCw,
  Download,
  Plus,
  Calculator,
  Calendar,
  Award
} from 'lucide-react';
import { leaveApi } from '../services/api/leave.api';
import { LeaveBalances } from '../services/api/leave.api';
import { useAuth } from '../hooks/useAuth';

interface LeaveBalanceManagerProps {
  organizationId?: string;
  selectedDepartment?: string;
  className?: string;
}

interface EmployeeBalance {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  balances: LeaveBalances;
  utilizationRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const LeaveBalanceManager: React.FC<LeaveBalanceManagerProps> = ({
  organizationId,
  selectedDepartment = 'all',
  className = ''
}) => {
  const { user } = useAuth();
  const [employeeBalances, setEmployeeBalances] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeBalance | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [bulkUpdateDialog, setBulkUpdateDialog] = useState(false);

  // Charger les soldes des employés
  const loadEmployeeBalances = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // Simuler des données de soldes (en production, cela viendrait de l'API)
      const mockBalances: EmployeeBalance[] = [
        {
          employeeId: 'EMP001',
          employeeName: 'Alice Martin',
          department: 'Développement',
          position: 'Senior Developer',
          balances: {
            vacation: { total: 25, used: 8, remaining: 17 },
            sick: { total: 10, used: 2, remaining: 8 },
            personal: { total: 5, used: 1, remaining: 4 }
          },
          utilizationRate: 32,
          riskLevel: 'low'
        },
        {
          employeeId: 'EMP002',
          employeeName: 'Bob Dupont',
          department: 'Design',
          position: 'UI Designer',
          balances: {
            vacation: { total: 25, used: 20, remaining: 5 },
            sick: { total: 10, used: 8, remaining: 2 },
            personal: { total: 5, used: 4, remaining: 1 }
          },
          utilizationRate: 80,
          riskLevel: 'high'
        },
        {
          employeeId: 'EMP003',
          employeeName: 'Claire Moreau',
          department: 'Marketing',
          position: 'Marketing Manager',
          balances: {
            vacation: { total: 25, used: 15, remaining: 10 },
            sick: { total: 10, used: 3, remaining: 7 },
            personal: { total: 5, used: 2, remaining: 3 }
          },
          utilizationRate: 60,
          riskLevel: 'medium'
        }
      ];

      // Filtrer par département si nécessaire
      const filtered = selectedDepartment === 'all' 
        ? mockBalances 
        : mockBalances.filter(emp => emp.department.toLowerCase() === selectedDepartment.toLowerCase());

      setEmployeeBalances(filtered);
    } catch (err) {
      setError('Erreur lors du chargement des soldes');
      console.error('Failed to load employee balances:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les employés
  const filteredEmployees = employeeBalances.filter(employee => {
    const matchesSearch = !searchTerm || 
      employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'all' || employee.riskLevel === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  // Obtenir le badge de niveau de risque
  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">Élevé</Badge>;
      case 'medium':
        return <Badge variant="warning">Moyen</Badge>;
      case 'low':
        return <Badge variant="success">Faible</Badge>;
    }
  };

  // Calculer les statistiques globales
  const getGlobalStats = () => {
    const totalEmployees = filteredEmployees.length;
    const highRiskEmployees = filteredEmployees.filter(e => e.riskLevel === 'high').length;
    const avgUtilization = totalEmployees > 0 
      ? filteredEmployees.reduce((sum, e) => sum + e.utilizationRate, 0) / totalEmployees 
      : 0;
    
    const totalVacationDays = filteredEmployees.reduce((sum, e) => sum + e.balances.vacation.total, 0);
    const usedVacationDays = filteredEmployees.reduce((sum, e) => sum + e.balances.vacation.used, 0);
    const remainingVacationDays = filteredEmployees.reduce((sum, e) => sum + e.balances.vacation.remaining, 0);

    return {
      totalEmployees,
      highRiskEmployees,
      avgUtilization,
      totalVacationDays,
      usedVacationDays,
      remainingVacationDays
    };
  };

  const globalStats = getGlobalStats();

  useEffect(() => {
    loadEmployeeBalances();
  }, [organizationId, selectedDepartment]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employés</p>
                <p className="text-2xl font-bold">{globalStats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisation moy.</p>
                <p className="text-2xl font-bold">{globalStats.avgUtilization.toFixed(0)}%</p>
              </div>
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours restants</p>
                <p className="text-2xl font-bold text-purple-600">{globalStats.remainingVacationDays}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risque élevé</p>
                <p className="text-2xl font-bold text-red-600">{globalStats.highRiskEmployees}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {globalStats.highRiskEmployees > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {globalStats.highRiskEmployees} employé{globalStats.highRiskEmployees > 1 ? 's ont' : ' a'} un risque élevé d'épuisement des congés
          </AlertDescription>
        </Alert>
      )}

      {/* Gestion des soldes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Soldes de congés ({filteredEmployees.length})
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajustement en lot
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEmployeeBalances}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Niveau de risque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="high">Risque élevé</SelectItem>
                <SelectItem value="medium">Risque moyen</SelectItem>
                <SelectItem value="low">Risque faible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau des soldes */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Congés payés</TableHead>
                <TableHead>Maladie</TableHead>
                <TableHead>Personnel</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Risque</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.employeeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.employeeId} • {employee.department}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{employee.balances.vacation.remaining}/{employee.balances.vacation.total}</span>
                        <span className="text-muted-foreground">
                          {((employee.balances.vacation.remaining / employee.balances.vacation.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(employee.balances.vacation.remaining / employee.balances.vacation.total) * 100} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{employee.balances.sick.remaining}/{employee.balances.sick.total}</span>
                        <span className="text-muted-foreground">
                          {((employee.balances.sick.remaining / employee.balances.sick.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(employee.balances.sick.remaining / employee.balances.sick.total) * 100} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{employee.balances.personal.remaining}/{employee.balances.personal.total}</span>
                        <span className="text-muted-foreground">
                          {((employee.balances.personal.remaining / employee.balances.personal.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(employee.balances.personal.remaining / employee.balances.personal.total) * 100} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{employee.utilizationRate}%</span>
                      {employee.utilizationRate >= 80 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : employee.utilizationRate >= 50 ? (
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRiskBadge(employee.riskLevel)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setEditDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun employé trouvé</p>
              <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition des soldes */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier les soldes de congés</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.employeeName} ({selectedEmployee?.employeeId})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <Tabs defaultValue="vacation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vacation">Congés payés</TabsTrigger>
                <TabsTrigger value="sick">Maladie</TabsTrigger>
                <TabsTrigger value="personal">Personnel</TabsTrigger>
              </TabsList>

              <TabsContent value="vacation" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total annuel</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.vacation.total}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Utilisés</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.vacation.used}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Restants</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.vacation.remaining}
                      className="mt-1"
                      disabled
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sick" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total annuel</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.sick.total}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Utilisés</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.sick.used}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Restants</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.sick.remaining}
                      className="mt-1"
                      disabled
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total annuel</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.personal.total}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Utilisés</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.personal.used}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Restants</label>
                    <Input
                      type="number"
                      defaultValue={selectedEmployee?.balances.personal.remaining}
                      className="mt-1"
                      disabled
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={() => setEditDialog(false)}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};