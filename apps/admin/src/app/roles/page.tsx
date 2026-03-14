'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Shield,
  Users,
  Key,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { roles, type Role } from '@/lib/mock-data';

const roleColors: Record<string, { bg: string; icon: string; ring: string }> = {
  'super-admin': {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    ring: 'ring-amber-200',
  },
  admin: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    ring: 'ring-blue-200',
  },
  manager: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-200',
  },
  support: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    ring: 'ring-purple-200',
  },
  finance: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    ring: 'ring-orange-200',
  },
  content: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    ring: 'ring-pink-200',
  },
};

function getRoleColor(slug: string) {
  return (
    roleColors[slug] ?? {
      bg: 'bg-gray-50',
      icon: 'text-gray-500',
      ring: 'ring-gray-200',
    }
  );
}

export default function RolesPage() {
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const totalUsers = roles.reduce((sum, r) => sum + r.users, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-heading">
            Roles &amp; Permissions
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Manage user roles &middot;{' '}
            <span className="font-medium text-body">{roles.length} roles</span>{' '}
            &middot;{' '}
            <span className="font-medium text-body">{totalUsers} users</span>
          </p>
        </div>
        <button className="btn-primary">
          <Plus size={15} />
          Create Role
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role, i) => {
          const color = getRoleColor(role.slug);
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
            >
              {/* Actions Menu */}
              <div className="absolute right-4 top-4">
                <div className="relative">
                  <button
                    onClick={() =>
                      setActionMenu(actionMenu === role.id ? null : role.id)
                    }
                    className="rounded-lg p-1.5 text-subtle opacity-0 transition-all hover:bg-gray-100 hover:text-heading group-hover:opacity-100"
                  >
                    <MoreVertical size={15} />
                  </button>
                  <AnimatePresence>
                    {actionMenu === role.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-border bg-white shadow-dropdown"
                      >
                        <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                          <Edit size={14} /> Edit
                        </button>
                        <div className="mx-3 my-0.5 border-t border-border" />
                        <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger-500 transition-colors hover:bg-danger-50">
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Shield Icon + Role Name */}
              <div className="mb-4 flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${color.bg} ring-1 ${color.ring}`}
                >
                  <Shield size={22} className={color.icon} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-heading">
                    {role.name}
                  </h3>
                  <p className="text-xs text-muted">/{role.slug}</p>
                </div>
              </div>

              {/* Description */}
              <p className="mb-5 text-sm leading-relaxed text-muted">
                {role.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-border-light bg-gray-50/70 px-3.5 py-2.5">
                  <Users size={14} className="text-muted" />
                  <div>
                    <p className="text-sm font-bold text-heading">
                      {role.users}
                    </p>
                    <p className="text-[11px] text-muted">Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-border-light bg-gray-50/70 px-3.5 py-2.5">
                  <Key size={14} className="text-muted" />
                  <div>
                    <p className="text-sm font-bold text-heading">
                      {role.permissions}
                    </p>
                    <p className="text-[11px] text-muted">Permissions</p>
                  </div>
                </div>
              </div>

              {/* Created date */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-border-light pt-4 text-xs text-muted">
                <Calendar size={12} />
                Created {role.createdAt}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
