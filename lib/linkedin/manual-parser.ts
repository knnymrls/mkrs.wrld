/**
 * Manual LinkedIn Profile Parser
 * Parses copy-pasted LinkedIn profile text
 */

export interface ParsedSection {
  name?: string;
  title?: string;
  location?: string;
  about?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    year?: string;
  }>;
  skills?: string[];
}

export class ManualLinkedInParser {
  /**
   * Parses manually copied LinkedIn profile text
   * Users can copy their entire profile or specific sections
   */
  static parseProfileText(text: string): ParsedSection {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const result: ParsedSection = {};

    // Try to extract name (usually first non-empty line)
    if (lines.length > 0 && !lines[0].toLowerCase().includes('linkedin')) {
      result.name = lines[0];
    }

    // Extract sections
    let currentSection = '';
    let sectionContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Detect section headers
      if (this.isSectionHeader(line)) {
        // Process previous section
        if (currentSection && sectionContent.length > 0) {
          this.processSection(currentSection, sectionContent, result);
        }
        currentSection = lowerLine;
        sectionContent = [];
      } else {
        sectionContent.push(line);
      }
    }

    // Process last section
    if (currentSection && sectionContent.length > 0) {
      this.processSection(currentSection, sectionContent, result);
    }

    // Try to extract title and location from early lines if not found
    if (!result.title || !result.location) {
      for (let i = 1; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (!result.title && this.looksLikeTitle(line)) {
          result.title = line;
        } else if (!result.location && this.looksLikeLocation(line)) {
          result.location = line;
        }
      }
    }

    return result;
  }

  private static isSectionHeader(line: string): boolean {
    const headers = [
      'about', 'summary', 'experience', 'education', 'skills', 
      'work experience', 'professional experience', 'employment',
      'academic background', 'expertise', 'competencies'
    ];
    const lower = line.toLowerCase();
    return headers.some(header => 
      lower === header || 
      lower.startsWith(header + ':') ||
      lower.endsWith(header)
    );
  }

  private static processSection(section: string, content: string[], result: ParsedSection) {
    const joinedContent = content.join('\n');

    if (section.includes('about') || section.includes('summary')) {
      result.about = joinedContent;
    } else if (section.includes('experience') || section.includes('employment')) {
      result.experience = this.parseExperience(content);
    } else if (section.includes('education') || section.includes('academic')) {
      result.education = this.parseEducation(content);
    } else if (section.includes('skill') || section.includes('expertise') || section.includes('competencies')) {
      result.skills = this.parseSkills(content);
    }
  }

  private static parseExperience(lines: string[]): ParsedSection['experience'] {
    const experiences: ParsedSection['experience'] = [];
    let current: any = {};

    for (const line of lines) {
      // Check if this looks like a job title
      if (this.looksLikeJobTitle(line) && current.company) {
        // Save previous experience and start new one
        if (current.title) {
          experiences.push(current);
        }
        current = { title: line };
      } else if (this.looksLikeCompany(line)) {
        if (current.title && current.company) {
          // This is a new experience
          experiences.push(current);
          current = { company: line };
        } else {
          current.company = line;
        }
      } else if (this.looksLikeDuration(line)) {
        current.duration = line;
      } else if (line.length > 50 && current.title) {
        // Likely a description
        current.description = current.description 
          ? current.description + ' ' + line 
          : line;
      } else if (!current.title && line.length > 10) {
        // First line might be the title
        current.title = line;
      }
    }

    // Add the last experience
    if (current.title) {
      experiences.push(current);
    }

    return experiences;
  }

  private static parseEducation(lines: string[]): ParsedSection['education'] {
    const education: ParsedSection['education'] = [];
    let current: any = {};

    for (const line of lines) {
      if (this.looksLikeSchool(line)) {
        if (current.school) {
          education.push(current);
          current = {};
        }
        current.school = line;
      } else if (this.looksLikeDegree(line)) {
        current.degree = line;
      } else if (this.looksLikeYear(line)) {
        current.year = line;
      } else if (!current.degree && current.school && line.length > 5) {
        // Might be the degree
        current.degree = line;
      }
    }

    // Add the last education
    if (current.school) {
      education.push(current);
    }

    return education;
  }

  private static parseSkills(lines: string[]): string[] {
    const skills: string[] = [];
    const joined = lines.join(' ');
    
    // Try different delimiters
    const delimiters = [',', '·', '•', '|', ';'];
    let items: string[] = [];

    for (const delimiter of delimiters) {
      if (joined.includes(delimiter)) {
        items = joined.split(delimiter);
        break;
      }
    }

    // If no delimiter found, treat each line as a skill
    if (items.length === 0) {
      items = lines;
    }

    // Clean and filter skills
    for (const item of items) {
      const cleaned = item.trim();
      if (cleaned && cleaned.length > 1 && cleaned.length < 50) {
        skills.push(cleaned);
      }
    }

    return skills;
  }

  private static looksLikeTitle(line: string): boolean {
    const titleKeywords = [
      'engineer', 'developer', 'manager', 'director', 'analyst',
      'designer', 'architect', 'consultant', 'specialist', 'lead',
      'senior', 'junior', 'chief', 'head', 'vp', 'president'
    ];
    const lower = line.toLowerCase();
    return titleKeywords.some(keyword => lower.includes(keyword)) && line.length < 100;
  }

  private static looksLikeLocation(line: string): boolean {
    const locationPatterns = [
      /,\s*[A-Z]{2}$/,  // Ends with state code
      /\d{5}/,          // Contains zip code
      / area/i,         // Contains "area"
      /remote/i,        // Remote work
    ];
    const locationKeywords = ['city', 'area', 'remote', 'hybrid'];
    const lower = line.toLowerCase();
    
    return line.length < 100 && (
      locationPatterns.some(pattern => pattern.test(line)) ||
      locationKeywords.some(keyword => lower.includes(keyword)) ||
      (line.includes(',') && line.split(',').length === 2) // City, State format
    );
  }

  private static looksLikeJobTitle(line: string): boolean {
    return this.looksLikeTitle(line);
  }

  private static looksLikeCompany(line: string): boolean {
    const companyKeywords = ['inc', 'corp', 'llc', 'ltd', 'company', 'google', 'microsoft', 'apple'];
    const lower = line.toLowerCase();
    return line.length < 100 && (
      companyKeywords.some(keyword => lower.includes(keyword)) ||
      /^[A-Z]/.test(line) // Starts with capital letter
    );
  }

  private static looksLikeDuration(line: string): boolean {
    const durationPatterns = [
      /\d{4}\s*-\s*\d{4}/,     // 2020 - 2023
      /\d{4}\s*-\s*present/i,  // 2020 - Present
      /\w+\s+\d{4}\s*-/,       // Jan 2020 -
      /\(\d+\s*(yr|year|mo|month)/i, // (2 years)
    ];
    return durationPatterns.some(pattern => pattern.test(line));
  }

  private static looksLikeSchool(line: string): boolean {
    const schoolKeywords = ['university', 'college', 'institute', 'school', 'academy'];
    const lower = line.toLowerCase();
    return schoolKeywords.some(keyword => lower.includes(keyword));
  }

  private static looksLikeDegree(line: string): boolean {
    const degreePatterns = [
      /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|MBA|MD|JD)\b/i,
      /\b(bachelor|master|doctor|associate)\b/i,
      /\b(degree|diploma|certificate)\b/i,
    ];
    return degreePatterns.some(pattern => pattern.test(line));
  }

  private static looksLikeYear(line: string): boolean {
    return /\b(19|20)\d{2}\b/.test(line) && line.length < 50;
  }
}