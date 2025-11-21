import { seoProjects } from '@/db/index.js';
export type NewProject = {
    name: string;
    description?: string | null;
    domain: string;
    targetRegion?: string;
    primaryKeywords: string[];
    targetDomainAuthority?: number;
    targetCtrIncrease?: number;
    ownerId: string;
};
export type ProjectInput = Omit<NewProject, 'ownerId'>;
export type SeoProject = typeof seoProjects.$inferSelect;
/**
 * SEO Service
 * Handles business logic for SEO projects
 */
export declare class SeoService {
    /**
     * Create a new SEO project
     */
    createProject(data: NewProject): Promise<SeoProject>;
    /**
     * Get project by ID
     */
    getProjectById(id: string): Promise<SeoProject | null>;
    /**
     * Get projects by owner ID
     */
    getProjectsByOwner(ownerId: string): Promise<SeoProject[]>;
    /**
     * Get user projects
     * Returns projects ordered by createdAt descending (newest first)
     */
    getUserProjects(userId: string): Promise<Array<{
        id: string;
        name: string;
        domain: string;
        targetRegion: string | null;
        status: string;
        createdAt: Date;
    }>>;
}
export declare const seoService: SeoService;
//# sourceMappingURL=seoService.d.ts.map