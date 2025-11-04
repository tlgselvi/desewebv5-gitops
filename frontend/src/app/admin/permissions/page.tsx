'use client';

import React, { useState } from 'react';
import { PermissionManager } from '@/components/admin/PermissionManager';
import { RoleEditor } from '@/components/admin/RoleEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Admin Permissions Management Page
 * Phase-5 Sprint 2: Task 2.1
 * 
 * Provides comprehensive RBAC permission and role management interface
 */

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState('permissions');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RBAC Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage permissions, roles, and access control
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>
            <TabsContent value="permissions" className="mt-6">
              <PermissionManager />
            </TabsContent>
            <TabsContent value="roles" className="mt-6">
              <RoleEditor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RBAC Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Permissions</p>
              <p className="text-2xl font-bold">Loading...</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Roles</p>
              <p className="text-2xl font-bold">Loading...</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Active Assignments</p>
              <p className="text-2xl font-bold">Loading...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

