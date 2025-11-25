CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "deals_close_date_idx" ON "deals" USING btree ("expected_close_date");