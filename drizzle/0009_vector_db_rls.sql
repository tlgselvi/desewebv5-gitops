-- Vector DB RLS Policies
-- Enables Row Level Security for vector_index_metadata and chat_history tables

--> statement-breakpoint
ALTER TABLE "vector_index_metadata" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "chat_history" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
-- Vector Index Metadata Policies
CREATE POLICY "Users can view their organization's vector index metadata"
ON "vector_index_metadata" FOR SELECT
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
);

--> statement-breakpoint
CREATE POLICY "Organization admins can manage their organization's vector index metadata"
ON "vector_index_metadata" FOR ALL
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
);

--> statement-breakpoint
CREATE POLICY "System can insert vector index metadata"
ON "vector_index_metadata" FOR INSERT
WITH CHECK (
  organization_id = current_setting('app.current_organization_id', true)::uuid
);

--> statement-breakpoint
-- Chat History Policies
CREATE POLICY "Users can view their own chat history"
ON "chat_history" FOR SELECT
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND user_id = current_setting('app.current_user_id', true)::uuid
);

--> statement-breakpoint
CREATE POLICY "Organization admins can view their organization's chat history"
ON "chat_history" FOR SELECT
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
);

--> statement-breakpoint
CREATE POLICY "Users can create their own chat history"
ON "chat_history" FOR INSERT
WITH CHECK (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND user_id = current_setting('app.current_user_id', true)::uuid
);

--> statement-breakpoint
CREATE POLICY "Users can delete their own chat history"
ON "chat_history" FOR DELETE
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND user_id = current_setting('app.current_user_id', true)::uuid
);

--> statement-breakpoint
CREATE POLICY "Organization admins can delete their organization's chat history"
ON "chat_history" FOR DELETE
USING (
  organization_id = current_setting('app.current_organization_id', true)::uuid
  AND current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
);

