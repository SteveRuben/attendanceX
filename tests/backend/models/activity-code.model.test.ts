/**
 * Tests unitaires pour ActivityCodeModel
 */

import { ActivityCodeModel } from '../../../backend/functions/src/models/activity-code.model';
import { ActivityCode, ActivityCodeInput } from '../../../backend/functions/src/common/types';
import { ValidationError } from '../../../backend/functions/src/models/base.model';

describe('ActivityCodeModel', () => {
  const mockActivityCodeData: Partial<ActivityCode> = {
    tenantId: 'tenant_123',
    code: 'DEV',
    name: 'Development',
    description: 'Software development activities',
    category: 'Engineering'
  };

  describe('Constructor', () => {
    it('should create an activity code with default values', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.billable).toBe(true);
      expect(activityCode.isActive).toBe(true);
      expect(activityCode.projectSpecific).toBe(false);
      expect(activityCode.hierarchy?.level).toBe(0);
      expect(activityCode.hierarchy?.path).toBe('DEV');
      expect(activityCode.hierarchy?.fullName).toBe('Development');
    });

    it('should preserve provided values', () => {
      const customData = {
        ...mockActivityCodeData,
        billable: false,
        isActive: false,
        projectSpecific: true,
        defaultRate: 75
      };

      const activityCode = new ActivityCodeModel(customData);
      
      expect(activityCode.billable).toBe(false);
      expect(activityCode.isActive).toBe(false);
      expect(activityCode.projectSpecific).toBe(true);
      expect(activityCode.defaultRate).toBe(75);
    });
  });

  describe('Hierarchy Management', () => {
    it('should set parent correctly', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      activityCode.setParent('parent_123', 'ENG', 'Engineering');
      
      expect(activityCode.parentId).toBe('parent_123');
      expect(activityCode.hierarchy?.level).toBe(1);
      expect(activityCode.hierarchy?.path).toBe('ENG/DEV');
      expect(activityCode.hierarchy?.fullName).toBe('Engineering > Development');
      expect(activityCode.isChild).toBe(true);
      expect(activityCode.isParent).toBe(false);
    });

    it('should not allow self as parent', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'activity_123'
      });
      
      expect(() => activityCode.setParent('activity_123', 'ENG', 'Engineering')).toThrow(ValidationError);
    });

    it('should remove parent correctly', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        parentId: 'parent_123'
      });
      
      activityCode.removeParent();
      
      expect(activityCode.parentId).toBeUndefined();
      expect(activityCode.hierarchy?.level).toBe(0);
      expect(activityCode.hierarchy?.path).toBe('DEV');
      expect(activityCode.hierarchy?.fullName).toBe('Development');
      expect(activityCode.isParent).toBe(true);
      expect(activityCode.isChild).toBe(false);
    });

    it('should update hierarchy info', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      activityCode.updateHierarchyInfo(2, 'ROOT/ENG/DEV', 'Root > Engineering > Development');
      
      expect(activityCode.hierarchy?.level).toBe(2);
      expect(activityCode.hierarchy?.path).toBe('ROOT/ENG/DEV');
      expect(activityCode.hierarchy?.fullName).toBe('Root > Engineering > Development');
    });

    it('should not allow negative hierarchy level', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      activityCode.updateHierarchyInfo(-1, 'DEV', 'Development');
      
      expect(activityCode.hierarchy?.level).toBe(0);
    });
  });

  describe('Status Management', () => {
    it('should activate and deactivate', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        isActive: false
      });
      
      activityCode.activate();
      expect(activityCode.isActive).toBe(true);
      
      activityCode.deactivate();
      expect(activityCode.isActive).toBe(false);
    });

    it('should toggle active status', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.isActive).toBe(true);
      
      activityCode.toggleActive();
      expect(activityCode.isActive).toBe(false);
      
      activityCode.toggleActive();
      expect(activityCode.isActive).toBe(true);
    });
  });

  describe('Billing Management', () => {
    it('should make billable and non-billable', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: false
      });
      
      activityCode.makeBillable();
      expect(activityCode.billable).toBe(true);
      
      activityCode.makeNonBillable();
      expect(activityCode.billable).toBe(false);
    });

    it('should remove rate when making non-billable', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: true,
        defaultRate: 50
      });
      
      activityCode.makeNonBillable();
      
      expect(activityCode.billable).toBe(false);
      expect(activityCode.defaultRate).toBeUndefined();
    });

    it('should toggle billable status', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.billable).toBe(true);
      
      activityCode.toggleBillable();
      expect(activityCode.billable).toBe(false);
      
      activityCode.toggleBillable();
      expect(activityCode.billable).toBe(true);
    });
  });

  describe('Rate Management', () => {
    it('should set default rate for billable code', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      activityCode.setDefaultRate(75);
      
      expect(activityCode.defaultRate).toBe(75);
      expect(activityCode.hasDefaultRate()).toBe(true);
    });

    it('should not set rate for non-billable code', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: false
      });
      
      expect(() => activityCode.setDefaultRate(75)).toThrow(ValidationError);
    });

    it('should not set negative rate', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(() => activityCode.setDefaultRate(-10)).toThrow(ValidationError);
    });

    it('should remove default rate', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        defaultRate: 50
      });
      
      activityCode.removeDefaultRate();
      
      expect(activityCode.defaultRate).toBeUndefined();
      expect(activityCode.hasDefaultRate()).toBe(false);
    });
  });

  describe('Project Specificity Management', () => {
    it('should make project specific and global', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      activityCode.makeProjectSpecific();
      expect(activityCode.projectSpecific).toBe(true);
      
      activityCode.makeGlobal();
      expect(activityCode.projectSpecific).toBe(false);
    });

    it('should toggle project specificity', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.projectSpecific).toBe(false);
      
      activityCode.toggleProjectSpecific();
      expect(activityCode.projectSpecific).toBe(true);
      
      activityCode.toggleProjectSpecific();
      expect(activityCode.projectSpecific).toBe(false);
    });
  });

  describe('Hierarchy Validation', () => {
    it('should validate parent-child relationships', () => {
      const parentCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'parent_123',
        code: 'ENG'
      });

      const childCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'child_123',
        code: 'DEV',
        parentId: 'parent_123'
      });

      expect(parentCode.canBeParentOf(childCode.getData())).toBe(true);
      expect(childCode.canHaveParent(parentCode.getData())).toBe(true);
    });

    it('should not allow self as parent', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'activity_123'
      });

      expect(activityCode.canBeParentOf(activityCode.getData())).toBe(false);
      expect(activityCode.canHaveParent(activityCode.getData())).toBe(false);
    });

    it('should not allow child as parent of another code', () => {
      const parentCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'parent_123',
        code: 'ENG'
      });

      const childCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'child_123',
        code: 'DEV',
        parentId: 'parent_123'
      });

      const anotherCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'another_123',
        code: 'TEST'
      });

      expect(childCode.canBeParentOf(anotherCode.getData())).toBe(false);
      expect(anotherCode.canHaveParent(childCode.getData())).toBe(false);
    });

    it('should validate hierarchy consistency', () => {
      const parentCode: ActivityCode = {
        ...mockActivityCodeData,
        id: 'parent_123',
        code: 'ENG',
        name: 'Engineering'
      } as ActivityCode;

      const childCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'child_123',
        code: 'DEV',
        parentId: 'parent_123',
        hierarchy: {
          level: 1,
          path: 'ENG/DEV',
          fullName: 'Engineering > Development'
        }
      });

      const allCodes = [parentCode, childCode.getData()];
      const issues = childCode.validateHierarchyConsistency(allCodes);
      
      expect(issues).toEqual([]);
    });

    it('should detect missing parent', () => {
      const childCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'child_123',
        parentId: 'nonexistent_parent'
      });

      const allCodes = [childCode.getData()];
      const issues = childCode.validateHierarchyConsistency(allCodes);
      
      expect(issues).toContain('Parent activity code not found');
    });

    it('should detect excessive hierarchy levels', () => {
      const grandParentCode: ActivityCode = {
        ...mockActivityCodeData,
        id: 'grandparent_123',
        code: 'ROOT'
      } as ActivityCode;

      const parentCode: ActivityCode = {
        ...mockActivityCodeData,
        id: 'parent_123',
        code: 'ENG',
        parentId: 'grandparent_123'
      } as ActivityCode;

      const childCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        id: 'child_123',
        parentId: 'parent_123'
      });

      const allCodes = [grandParentCode, parentCode, childCode.getData()];
      const issues = childCode.validateHierarchyConsistency(allCodes);
      
      expect(issues).toContain('Activity code hierarchy cannot exceed 2 levels');
    });
  });

  describe('Search and Filtering', () => {
    it('should match search terms', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.matchesSearchTerm('dev')).toBe(true);
      expect(activityCode.matchesSearchTerm('Development')).toBe(true);
      expect(activityCode.matchesSearchTerm('software')).toBe(true);
      expect(activityCode.matchesSearchTerm('engineering')).toBe(true);
      expect(activityCode.matchesSearchTerm('nonexistent')).toBe(false);
      expect(activityCode.matchesSearchTerm('')).toBe(true);
    });

    it('should check category membership', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.isInCategory('Engineering')).toBe(true);
      expect(activityCode.isInCategory('ENGINEERING')).toBe(true);
      expect(activityCode.isInCategory('Marketing')).toBe(false);
    });

    it('should check tenant association', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      expect(activityCode.isForTenant('tenant_123')).toBe(true);
      expect(activityCode.isForTenant('tenant_456')).toBe(false);
    });

    it('should match filters', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: true,
        isActive: true,
        projectSpecific: false,
        parentId: 'parent_123'
      });
      
      expect(activityCode.matchesFilters({
        category: 'Engineering',
        billable: true,
        isActive: true,
        projectSpecific: false,
        hasParent: true
      })).toBe(true);
      
      expect(activityCode.matchesFilters({
        billable: false
      })).toBe(false);
      
      expect(activityCode.matchesFilters({
        hasParent: false
      })).toBe(false);
    });
  });

  describe('Tree Operations', () => {
    it('should build activity code tree', () => {
      const parentCode1: ActivityCode = {
        ...mockActivityCodeData,
        id: 'parent_1',
        code: 'ENG',
        name: 'Engineering'
      } as ActivityCode;

      const childCode1: ActivityCode = {
        ...mockActivityCodeData,
        id: 'child_1',
        code: 'DEV',
        name: 'Development',
        parentId: 'parent_1'
      } as ActivityCode;

      const childCode2: ActivityCode = {
        ...mockActivityCodeData,
        id: 'child_2',
        code: 'TEST',
        name: 'Testing',
        parentId: 'parent_1'
      } as ActivityCode;

      const parentCode2: ActivityCode = {
        ...mockActivityCodeData,
        id: 'parent_2',
        code: 'MKT',
        name: 'Marketing'
      } as ActivityCode;

      const allCodes = [parentCode1, childCode1, childCode2, parentCode2];
      const tree = ActivityCodeModel.buildTree(allCodes);
      
      expect(tree).toHaveLength(2);
      expect(tree[0].code).toBe('ENG');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[1].code).toBe('MKT');
      expect(tree[1].children).toHaveLength(0);
    });

    it('should flatten activity code tree', () => {
      const tree = [
        {
          id: 'parent_1',
          code: 'ENG',
          name: 'Engineering',
          level: 0,
          children: [
            {
              id: 'child_1',
              code: 'DEV',
              name: 'Development',
              level: 1,
              children: []
            }
          ]
        }
      ];

      const flattened = ActivityCodeModel.flattenTree(tree);
      
      expect(flattened).toHaveLength(2);
      expect(flattened[0].code).toBe('ENG');
      expect(flattened[0].parentId).toBeUndefined();
      expect(flattened[1].code).toBe('DEV');
      expect(flattened[1].parentId).toBe('parent_1');
    });
  });

  describe('Update from Input', () => {
    it('should update activity code from input', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      const input: Partial<ActivityCodeInput> = {
        code: 'dev-new',
        name: 'New Development',
        description: 'Updated description',
        category: 'Tech',
        billable: false,
        isActive: false
      };
      
      activityCode.updateFromInput(input);
      
      expect(activityCode.code).toBe('DEV-NEW'); // Converti en majuscules
      expect(activityCode.name).toBe('New Development');
      expect(activityCode.description).toBe('Updated description');
      expect(activityCode.category).toBe('Tech');
      expect(activityCode.billable).toBe(false);
      expect(activityCode.isActive).toBe(false);
      expect(activityCode.defaultRate).toBeUndefined(); // Supprimé car non facturable
    });

    it('should not set rate for non-billable code', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      const input: Partial<ActivityCodeInput> = {
        billable: false,
        defaultRate: 50
      };
      
      expect(() => activityCode.updateFromInput(input)).toThrow(ValidationError);
    });

    it('should reset hierarchy when code or name changes', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        parentId: 'parent_123'
      });
      
      const input: Partial<ActivityCodeInput> = {
        code: 'NEW-CODE'
      };
      
      activityCode.updateFromInput(input);
      
      expect(activityCode.hierarchy?.path).toBe('NEW-CODE');
      expect(activityCode.hierarchy?.fullName).toBe('Development');
    });
  });

  describe('Utility Methods', () => {
    it('should get activity info', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        defaultRate: 50,
        parentId: 'parent_123'
      });
      
      const info = activityCode.getActivityInfo();
      
      expect(info.isParent).toBe(false);
      expect(info.isChild).toBe(true);
      expect(info.hasDefaultRate).toBe(true);
      expect(info.hierarchyLevel).toBe(1);
    });

    it('should get display names', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        hierarchy: {
          level: 1,
          path: 'ENG/DEV',
          fullName: 'Engineering > Development'
        }
      });
      
      expect(activityCode.getDisplayName()).toBe('DEV - Development');
      expect(activityCode.getFullDisplayName()).toBe('Engineering > Development');
      expect(activityCode.getCategoryDisplayName()).toBe('[Engineering] DEV - Development');
    });
  });

  describe('Comparison Methods', () => {
    it('should check similarity', () => {
      const activityCode1 = new ActivityCodeModel(mockActivityCodeData);
      
      const similarCode: ActivityCode = {
        ...mockActivityCodeData,
        id: 'other_id',
        code: 'DEV'
      } as ActivityCode;
      
      const differentCode: ActivityCode = {
        ...mockActivityCodeData,
        id: 'other_id',
        code: 'TEST',
        name: 'Testing'
      } as ActivityCode;
      
      expect(activityCode1.isSimilarTo(similarCode)).toBe(true);
      expect(activityCode1.isSimilarTo(differentCode)).toBe(false);
    });

    it('should check same category', () => {
      const activityCode1 = new ActivityCodeModel(mockActivityCodeData);
      
      const sameCategoryCode: ActivityCode = {
        ...mockActivityCodeData,
        code: 'TEST',
        category: 'Engineering'
      } as ActivityCode;
      
      const differentCategoryCode: ActivityCode = {
        ...mockActivityCodeData,
        code: 'MKT',
        category: 'Marketing'
      } as ActivityCode;
      
      expect(activityCode1.belongsToSameCategory(sameCategoryCode)).toBe(true);
      expect(activityCode1.belongsToSameCategory(differentCategoryCode)).toBe(false);
    });

    it('should check same parent', () => {
      const activityCode1 = new ActivityCodeModel({
        ...mockActivityCodeData,
        parentId: 'parent_123'
      });
      
      const sameParentCode: ActivityCode = {
        ...mockActivityCodeData,
        code: 'TEST',
        parentId: 'parent_123'
      } as ActivityCode;
      
      const differentParentCode: ActivityCode = {
        ...mockActivityCodeData,
        code: 'MKT',
        parentId: 'parent_456'
      } as ActivityCode;
      
      expect(activityCode1.hasSameParent(sameParentCode)).toBe(true);
      expect(activityCode1.hasSameParent(differentParentCode)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate a correct activity code', async () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      
      await expect(activityCode.validate()).resolves.toBe(true);
    });

    it('should reject empty code', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        code: ''
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject invalid code format', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        code: 'invalid-code-with-lowercase'
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject too long code', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        code: 'A'.repeat(21)
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject empty name', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        name: ''
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject negative default rate', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        defaultRate: -10
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject rate for non-billable code', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: false,
        defaultRate: 50
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject invalid hierarchy level', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        hierarchy: {
          level: 5,
          path: 'DEV',
          fullName: 'Development'
        }
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject inconsistent parent-child hierarchy', async () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        parentId: 'parent_123',
        hierarchy: {
          level: 0, // Devrait être 1 pour un enfant
          path: 'DEV',
          fullName: 'Development'
        }
      });
      
      await expect(activityCode.validate()).rejects.toThrow(ValidationError);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect very short code', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        code: 'A'
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('very_short_code');
    });

    it('should detect very short name', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        name: 'AB'
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('very_short_name');
    });

    it('should detect very high rate', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        defaultRate: 600
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('very_high_rate');
    });

    it('should detect very low rate', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        defaultRate: 3
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('very_low_rate');
    });

    it('should detect billable without rate', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        billable: true
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('billable_without_rate');
    });

    it('should detect inactive project specific code', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        isActive: false,
        projectSpecific: true
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('inactive_project_specific');
    });

    it('should detect inconsistent hierarchy', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        parentId: 'parent_123',
        hierarchy: {
          level: 0, // Incohérent avec parentId
          path: 'DEV',
          fullName: 'Development'
        }
      });
      
      const anomalies = activityCode.detectAnomalies();
      expect(anomalies).toContain('inconsistent_hierarchy_level');
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const activityCode = new ActivityCodeModel(mockActivityCodeData);
      const firestoreData = activityCode.toFirestore();
      
      expect(firestoreData.tenantId).toBe('tenant_123');
      expect(firestoreData.code).toBe('DEV');
      expect(firestoreData.name).toBe('Development');
      expect(firestoreData.category).toBe('Engineering');
      expect(firestoreData.billable).toBe(true);
      expect(firestoreData.isActive).toBe(true);
      expect(firestoreData.projectSpecific).toBe(false);
    });

    it('should handle null values correctly', () => {
      const activityCode = new ActivityCodeModel({
        ...mockActivityCodeData,
        description: undefined,
        parentId: undefined,
        defaultRate: undefined
      });
      
      const firestoreData = activityCode.toFirestore();
      expect(firestoreData.description).toBeNull();
      expect(firestoreData.parentId).toBeNull();
      expect(firestoreData.defaultRate).toBeNull();
    });
  });
});