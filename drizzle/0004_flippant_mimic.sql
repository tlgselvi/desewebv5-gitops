CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"manager_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"department_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"tckn" varchar(11) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"title" varchar(100),
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'active',
	"type" varchar(20) DEFAULT 'full_time',
	"salary_amount" numeric(12, 2) NOT NULL,
	"salary_currency" varchar(3) DEFAULT 'TRY',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"gross_salary" numeric(12, 2) NOT NULL,
	"bonus" numeric(12, 2) DEFAULT '0',
	"overtime_pay" numeric(12, 2) DEFAULT '0',
	"sgk_worker_share" numeric(12, 2) NOT NULL,
	"unemployment_worker_share" numeric(12, 2) NOT NULL,
	"income_tax" numeric(12, 2) NOT NULL,
	"stamp_tax" numeric(12, 2) NOT NULL,
	"sgk_employer_share" numeric(12, 2),
	"unemployment_employer_share" numeric(12, 2),
	"net_salary" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;