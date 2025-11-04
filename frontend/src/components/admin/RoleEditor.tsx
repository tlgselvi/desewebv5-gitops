'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Role {
  id: string;
  name: string;
  createdAt: string;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    category: string | null;
  }>;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  category: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function RoleEditor() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

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
        setAllPermissions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/rbac/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newRoleName }),
      });
      if (response.ok) {
        await loadRoles();
        setShowCreateModal(false);
        setNewRoleName('');
      }
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
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
        await loadRoles();
      }
    } catch (error) {
      console.error('Failed to assign permission:', error);
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
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
        await loadRoles();
      }
    } catch (error) {
      console.error('Failed to remove permission:', error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove all permissions.'))
      return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/rbac/roles/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await loadRoles();
        if (selectedRole?.id === id) {
          setSelectedRole(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const groupedPermissions = allPermissions.reduce(
    (acc, perm) => {
      const category = perm.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create Role</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Roles</h3>
          {roles.map((role) => (
            <Card
              key={role.id}
              className={selectedRole?.id === role.id ? 'border-primary' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id)}
                  >
                    Delete
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {role.permissions?.length || 0} permissions assigned
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedRole(role)}
                >
                  Edit Permissions
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedRole && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Edit Permissions: {selectedRole.name}</h3>
            <Card>
              <CardHeader>
                <CardTitle>Assigned Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedRole.permissions?.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">
                          {perm.resource}:{perm.action}
                        </p>
                        {perm.category && (
                          <Badge variant="secondary" className="text-xs">
                            {perm.category}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePermission(selectedRole.id, perm.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={Object.keys(groupedPermissions)[0]}>
                  <TabsList className="grid w-full grid-cols-4">
                    {Object.keys(groupedPermissions).map((category) => (
                      <TabsTrigger key={category} value={category}>
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <TabsContent key={category} value={category}>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {perms
                          .filter(
                            (p) =>
                              !selectedRole.permissions?.some((rp) => rp.id === p.id)
                          )
                          .map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {perm.resource}:{perm.action}
                                </p>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAssignPermission(selectedRole.id, perm.id)
                                }
                              >
                                Assign
                              </Button>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., finance_manager, seo_analyst"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

