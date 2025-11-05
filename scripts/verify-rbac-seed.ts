import postgres from 'postgres';
import { config } from '../src/config/index.js';

const connectionString = config.database.url;
const client = postgres(connectionString);

async function verifyRbacSeed() {
  try {
    console.log('Verifying RBAC seed data...\n');

    // Check roles
    const roles = await client`SELECT id, name, created_at FROM roles ORDER BY name`;
    console.log(`✅ Roles (${roles.length}):`);
    roles.forEach((role: { name: string; id: string }) => {
      console.log(`   - ${role.name} (${role.id.substring(0, 8)}...)`);
    });

    // Check permissions
    const permissions = await client`
      SELECT id, resource, action, description, category, created_at 
      FROM permissions 
      ORDER BY category, resource, action
    `;
    console.log(`\n✅ Permissions (${permissions.length}):`);
    permissions.forEach(
      (perm: {
        resource: string;
        action: string;
        description: string | null;
        category: string | null;
      }) => {
        console.log(
          `   - ${perm.resource}:${perm.action} [${perm.category || 'N/A'}] - ${perm.description || 'No description'}`
        );
      }
    );

    // Check role-permission assignments
    const rolePerms = await client`
      SELECT r.name as role_name, p.resource, p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY r.name, p.resource, p.action
    `;
    console.log(`\n✅ Role-Permission Assignments (${rolePerms.length}):`);
    let currentRole = '';
    rolePerms.forEach((rp: { role_name: string; resource: string; action: string }) => {
      if (rp.role_name !== currentRole) {
        console.log(`\n   ${rp.role_name}:`);
        currentRole = rp.role_name;
      }
      console.log(`      - ${rp.resource}:${rp.action}`);
    });

    console.log('\n✅ RBAC seed verification completed!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyRbacSeed();

