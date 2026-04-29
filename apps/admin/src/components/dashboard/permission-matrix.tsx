'use client';

import React, { useState } from 'react';
import { Card } from '@xelnova/ui';
import { Check } from 'lucide-react';

export type PermissionData = Record<string, Record<string, boolean>>;

interface PermissionMatrixProps {
  permissions: PermissionData;
  onChange: (permissions: PermissionData) => void;
  disabled?: boolean;
  showInherited?: Record<string, Record<string, boolean>>;
}

interface SectionConfig {
  label: string;
  actions: Array<{ key: string; label: string }>;
}

// Define all sections and their actions
const SECTIONS: Record<string, SectionConfig> = {
  products: {
    label: 'Products',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' },
      { key: 'reject', label: 'Reject' },
      { key: 'feature', label: 'Feature/Trending' },
    ],
  },
  orders: {
    label: 'Orders',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
      { key: 'cancel', label: 'Cancel' },
      { key: 'refund', label: 'Refund' },
      { key: 'exportData', label: 'Export' },
    ],
  },
  customers: {
    label: 'Customers',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
      { key: 'ban', label: 'Ban' },
      { key: 'exportData', label: 'Export' },
    ],
  },
  brands: {
    label: 'Brands',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' },
    ],
  },
  categories: {
    label: 'Categories',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  coupons: {
    label: 'Coupons',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  reports: {
    label: 'Reports & Analytics',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'export', label: 'Export' },
    ],
  },
  roles: {
    label: 'Roles & Admins',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'assignRoles', label: 'Assign Roles' },
    ],
  },
  settings: {
    label: 'Settings',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
    ],
  },
};

export function PermissionMatrix({
  permissions,
  onChange,
  disabled = false,
  showInherited,
}: PermissionMatrixProps) {
  const handleToggle = (section: string, action: string) => {
    if (disabled) return;

    const updated = JSON.parse(JSON.stringify(permissions));
    if (!updated[section]) {
      updated[section] = {};
    }
    updated[section][action] = !updated[section][action];
    onChange(updated);
  };

  const toggleSection = (section: string, enable: boolean) => {
    if (disabled) return;

    const updated = JSON.parse(JSON.stringify(permissions));
    if (!updated[section]) {
      updated[section] = {};
    }
    SECTIONS[section]?.actions.forEach(({ key }) => {
      updated[section][key] = enable;
    });
    onChange(updated);
  };

  const getSectionPermissions = (section: string) => {
    const config = SECTIONS[section];
    const perms = permissions[section] || {};
    return config?.actions.filter((a) => perms[a.key]).length || 0;
  };

  const getInheritedPermissions = (section: string) => {
    if (!showInherited) return new Set<string>();
    const inherited = showInherited[section] || {};
    const perms = permissions[section] || {};
    return new Set(
      Object.entries(inherited)
        .filter(([key, value]) => value && !perms[key])
        .map(([key]) => key),
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(SECTIONS).map(([sectionKey, config]) => {
        const sectionPerms = permissions[sectionKey] || {};
        const enabledCount = config.actions.filter((a) => sectionPerms[a.key]).length;
        const inheritedPerms = getInheritedPermissions(sectionKey);
        const hasInherited = inheritedPerms.size > 0;

        return (
          <Card key={sectionKey} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-text-primary">{config.label}</h3>
                <span className="text-xs bg-surface-muted px-2 py-1 rounded text-text-muted">
                  {enabledCount}/{config.actions.length}
                </span>
              </div>
              {!disabled && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey, true)}
                    className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:bg-surface-muted transition-colors"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey, false)}
                    className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:bg-surface-muted transition-colors"
                  >
                    None
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {config.actions.map(({ key, label }) => {
                const isEnabled = sectionPerms[key] === true;
                const isInherited = inheritedPerms.has(key);

                return (
                  <button
                    key={`${sectionKey}-${key}`}
                    type="button"
                    onClick={() => handleToggle(sectionKey, key)}
                    disabled={disabled || isInherited}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      isInherited
                        ? 'bg-surface-muted border-border text-text-muted cursor-not-allowed opacity-60'
                        : isEnabled
                          ? 'bg-primary-50 border-primary-300 text-primary-700 hover:bg-primary-100'
                          : 'bg-surface border-border text-text-secondary hover:bg-surface-muted'
                    }`}
                    title={isInherited ? 'Inherited from role level' : undefined}
                  >
                    {(isEnabled || isInherited) && <Check size={14} />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {hasInherited && (
              <p className="text-xs text-text-muted mt-2 italic">
                Grayed out permissions are inherited from the role level
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
