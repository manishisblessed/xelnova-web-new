'use client';

import React from 'react';
import { Card, Badge } from '@xelnova/ui';
import { Copy } from 'lucide-react';
import { PermissionData } from './permission-matrix';

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  level: string;
  permissionsData: PermissionData;
}

interface RoleTemplatesProps {
  templates: RoleTemplate[];
  onApply: (template: RoleTemplate) => void;
  loading?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'danger',
  MANAGER: 'warning',
  EDITOR: 'info',
  VIEWER: 'success',
};

const LEVEL_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

export function RoleTemplates({
  templates,
  onApply,
  loading = false,
}: RoleTemplatesProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-surface-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-text-muted">No role templates available</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onApply(template)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-text-primary">{template.name}</h4>
              <Badge
                variant={LEVEL_COLORS[template.level] as any}
                className="text-xs mt-1"
              >
                {LEVEL_LABELS[template.level] || template.level}
              </Badge>
            </div>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600 transition-colors flex-shrink-0"
              title="Apply template"
            >
              <Copy size={16} />
            </button>
          </div>
          {template.description && (
            <p className="text-xs text-text-muted line-clamp-2">
              {template.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            {getTemplatePermissionSummary(template.permissionsData).map(
              (perm) => (
                <span
                  key={perm}
                  className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded"
                >
                  {perm}
                </span>
              ),
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Extract a summary of what sections have full or partial access
 */
function getTemplatePermissionSummary(permissionsData: PermissionData): string[] {
  const summary: string[] = [];

  Object.entries(permissionsData).forEach(([section, actions]) => {
    const enabledCount = Object.values(actions).filter(Boolean).length;
    if (enabledCount > 0) {
      const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
      const totalCount = Object.keys(actions).length;
      if (enabledCount === totalCount) {
        summary.push(`${sectionLabel} (Full)`);
      } else {
        summary.push(`${sectionLabel} (${enabledCount}/${totalCount})`);
      }
    }
  });

  return summary.slice(0, 3); // Show first 3 only
}
