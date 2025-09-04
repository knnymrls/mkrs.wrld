import { createClient } from '@/lib/supabase/server';
import { Project, Contribution } from '../../models/Project';
import { Profile } from '../../models/Profile';
import ProjectsList from './ProjectsList';

interface ProjectWithContributors extends Project {
    contributors: Array<{
        contribution: Contribution;
        profile: Profile;
    }>;
}

export default async function Projects() {
    const supabase = await createClient();
    
    // Fetch all projects with contributors in a single query
    const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
            *,
            contributions (
                *,
                profiles:person_id (*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return <div>Error loading projects</div>;
    }

    // Transform data to match the expected format
    const projects: ProjectWithContributors[] = (projectsData || []).map(project => ({
        ...project,
        contributors: project.contributions?.map((contrib: any) => ({
            contribution: {
                id: contrib.id,
                person_id: contrib.person_id,
                project_id: contrib.project_id,
                role: contrib.role,
                start_date: contrib.start_date,
                end_date: contrib.end_date,
                description: contrib.description,
                created_at: contrib.created_at
            },
            profile: contrib.profiles
        })) || []
    }));


    return <ProjectsList initialProjects={projects} />;
}