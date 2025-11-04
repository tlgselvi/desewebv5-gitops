'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function PermissionManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPermission, setNewPermission] = useState({
    resource: '',
    action: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  const loadPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/rbac/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleCreatePermission = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPermission),
      });
      if (response.ok) {
        await loadPermissions();
        setShowCreateModal(false);
        setNewPermission({ resource: '', action: '', description: '', category: '' });
      }
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };

  const handleAssignRole = async (permissionId: string, roleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/permissions/${permissionId}/roles/${roleId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        await loadPermissions();
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveRole = async (permissionId: string, roleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/permissions/${permissionId}/roles/${roleId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        await loadPermissions();
      }
    } catch (error) {
      console.error('Failed to remove role:', error);
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/permissions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await loadPermissions();
      }
    } catch (error) {
      console.error('Failed to delete permission:', error);
    }
  };

  const categories = Array.from(new Set(permissions.map((p) => p.category).filter(Boolean)));

  const filteredPermissions = permissions.filter((p) => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch =
      searchTerm === '' ||
      p.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Permission Management</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create Permission</Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat || ''}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPermissions.map((permission) => (
          <Card key={permission.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {permission.resource}:{permission.action}
                  </CardTitle>
                  {permission.category && (
                    <Badge variant="secondary" className="mt-2">
                      {permission.category}
                    </Badge>
                  )}
                </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePermission(permission.id)}
                    className="text-destructive"
                  >
                    Delete
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {permission.description && (
                <p className="text-sm text-muted-foreground mb-4">{permission.description}</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Assigned Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {permission.roles.map((role) => (
                    <Badge key={role.id} variant="secondary" className="flex items-center gap-1">
                      {role.name}
                      <button
                        onClick={() => handleRemoveRole(permission.id, role.id)}
                        className="ml-1 text-destructive hover:underline"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                <Select
                  onValueChange={(roleId) => handleAssignRole(permission.id, roleId)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((role) => !permission.roles.some((r) => r.id === role.id))
                      .map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Permission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Resource</label>
                <Input
                  value={newPermission.resource}
                  onChange={(e) =>
                    setNewPermission({ ...newPermission, resource: e.target.value })
                  }
                  placeholder="e.g., finbot.accounts"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Action</label>
                <Input
                  value={newPermission.action}
                  onChange={(e) =>
                    setNewPermission({ ...newPermission, action: e.target.value })
                  }
                  placeholder="e.g., read, write, delete"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newPermission.description}
                  onChange={(e) =>
                    setNewPermission({ ...newPermission, description: e.target.value })
                  }
                  placeholder="Permission description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={newPermission.category}
                  onValueChange={(value) =>
                    setNewPermission({ ...newPermission, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePermission}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

