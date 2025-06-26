export interface LinkedInProfile {
  name?: string;
  title?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  education?: Array<{
    school: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
  }>;
  experience?: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  profilePicture?: string;
}

export class LinkedInParser {
  /**
   * Parses LinkedIn profile data from various formats
   * Supports both LinkedIn public profile HTML and structured data
   */
  static parseProfile(data: string): LinkedInProfile {
    const profile: LinkedInProfile = {};

    // Try to parse as JSON first (if using LinkedIn API or structured data)
    try {
      const jsonData = JSON.parse(data);
      return this.parseStructuredData(jsonData);
    } catch {
      // If not JSON, parse as HTML
      return this.parseHTML(data);
    }
  }

  private static parseStructuredData(data: any): LinkedInProfile {
    return {
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.name,
      title: data.headline || data.title,
      location: data.location?.name || data.locationName,
      bio: data.summary || data.about,
      skills: data.skills?.map((skill: any) => skill.name || skill) || [],
      education: data.education?.map((edu: any) => ({
        school: edu.schoolName || edu.school,
        degree: edu.degreeName || edu.degree,
        field: edu.fieldOfStudy || edu.field,
        startYear: edu.startDate?.year || edu.startYear,
        endYear: edu.endDate?.year || edu.endYear,
      })) || [],
      experience: data.experience?.map((exp: any) => ({
        company: exp.companyName || exp.company,
        title: exp.title || exp.role,
        location: exp.locationName || exp.location,
        startDate: this.formatDate(exp.startDate),
        endDate: exp.endDate ? this.formatDate(exp.endDate) : 'Present',
        description: exp.description,
      })) || [],
      profilePicture: data.profilePicture || data.photoUrl,
    };
  }

  private static parseHTML(html: string): LinkedInProfile {
    const profile: LinkedInProfile = {};
    
    // Remove script tags and their content
    const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Extract name
    const nameMatch = cleanHtml.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      cleanHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (nameMatch) {
      profile.name = this.cleanText(nameMatch[1]);
    }

    // Extract title
    const titleMatch = cleanHtml.match(/<div[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                       cleanHtml.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h2>/i);
    if (titleMatch) {
      profile.title = this.cleanText(titleMatch[1]);
    }

    // Extract location
    const locationMatch = cleanHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                          cleanHtml.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i);
    if (locationMatch) {
      profile.location = this.cleanText(locationMatch[1]);
    }

    // Extract bio/about
    const bioMatch = cleanHtml.match(/<section[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
                     cleanHtml.match(/<div[^>]*class="[^"]*about[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (bioMatch) {
      profile.bio = this.cleanText(bioMatch[1]);
    }

    // Extract skills
    const skillsSection = cleanHtml.match(/<section[^>]*class="[^"]*skills[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
    if (skillsSection) {
      const skillMatches = skillsSection[1].matchAll(/<span[^>]*>([^<]+)<\/span>/gi);
      profile.skills = Array.from(skillMatches).map(match => this.cleanText(match[1]));
    }

    // Extract experience
    const experienceSection = cleanHtml.match(/<section[^>]*class="[^"]*experience[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
    if (experienceSection) {
      profile.experience = this.parseExperienceSection(experienceSection[1]);
    }

    // Extract education
    const educationSection = cleanHtml.match(/<section[^>]*class="[^"]*education[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
    if (educationSection) {
      profile.education = this.parseEducationSection(educationSection[1]);
    }

    return profile;
  }

  private static parseExperienceSection(html: string): LinkedInProfile['experience'] {
    const experiences: LinkedInProfile['experience'] = [];
    const expBlocks = html.split(/<li[^>]*>/i).slice(1);

    for (const block of expBlocks) {
      const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/i);
      const companyMatch = block.match(/<p[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                          block.match(/<h4[^>]*>([^<]+)<\/h4>/i);
      const dateMatch = block.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                       block.match(/<time[^>]*>([^<]+)<\/time>/i);
      const descMatch = block.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      if (titleMatch && companyMatch) {
        const dates = this.parseDateRange(dateMatch?.[1] || '');
        experiences.push({
          title: this.cleanText(titleMatch[1]),
          company: this.cleanText(companyMatch[1]),
          startDate: dates.start,
          endDate: dates.end,
          description: descMatch ? this.cleanText(descMatch[1]) : undefined,
        });
      }
    }

    return experiences;
  }

  private static parseEducationSection(html: string): LinkedInProfile['education'] {
    const education: LinkedInProfile['education'] = [];
    const eduBlocks = html.split(/<li[^>]*>/i).slice(1);

    for (const block of eduBlocks) {
      const schoolMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/i);
      const degreeMatch = block.match(/<p[^>]*class="[^"]*degree[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                         block.match(/<span[^>]*class="[^"]*degree[^"]*"[^>]*>([^<]+)<\/span>/i);
      const fieldMatch = block.match(/<span[^>]*class="[^"]*field[^"]*"[^>]*>([^<]+)<\/span>/i);
      const dateMatch = block.match(/<time[^>]*>([^<]+)<\/time>/i) ||
                       block.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i);

      if (schoolMatch) {
        const dates = this.parseDateRange(dateMatch?.[1] || '');
        education.push({
          school: this.cleanText(schoolMatch[1]),
          degree: degreeMatch ? this.cleanText(degreeMatch[1]) : '',
          field: fieldMatch ? this.cleanText(fieldMatch[1]) : undefined,
          startYear: dates.start,
          endYear: dates.end,
        });
      }
    }

    return education;
  }

  private static parseDateRange(dateStr: string): { start?: string; end?: string } {
    const dates = dateStr.split(/[-–]/);
    return {
      start: dates[0]?.trim(),
      end: dates[1]?.trim() || undefined,
    };
  }

  private static formatDate(date: any): string | undefined {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    if (date.year && date.month) {
      return `${date.month} ${date.year}`;
    }
    return date.year?.toString();
  }

  private static cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validates if a URL is a LinkedIn profile URL
   */
  static isValidLinkedInUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.linkedin.com' || urlObj.hostname === 'linkedin.com';
    } catch {
      return false;
    }
  }

  /**
   * Extracts username from LinkedIn URL
   */
  static extractUsername(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    return match ? match[1] : null;
  }
}