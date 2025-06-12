export interface ExpandedTerms {
  original: string;
  expansions: string[];
  related: string[];
  synonyms: string[];
}

export class EntityExpander {
  private skillExpansions: Record<string, string[]> = {
    // Programming languages
    'javascript': ['js', 'es6', 'es2015', 'ecmascript', 'node.js', 'nodejs'],
    'typescript': ['ts', 'typed javascript'],
    'python': ['py', 'python3', 'python2'],
    'java': ['jvm', 'java8', 'java11', 'java17'],
    'c#': ['csharp', 'dotnet', '.net'],
    'go': ['golang'],
    'rust': ['rust-lang'],
    
    // Frontend
    'react': ['reactjs', 'react.js', 'react native', 'react hooks'],
    'angular': ['angular.js', 'angularjs', 'angular2+'],
    'vue': ['vuejs', 'vue.js', 'vue3'],
    'frontend': ['front-end', 'front end', 'ui development', 'client-side'],
    
    // Backend
    'backend': ['back-end', 'back end', 'server-side', 'api development'],
    'node': ['nodejs', 'node.js'],
    'django': ['python django', 'django rest'],
    'rails': ['ruby on rails', 'ror'],
    
    // Cloud & DevOps
    'aws': ['amazon web services', 'amazon cloud'],
    'azure': ['microsoft azure', 'ms azure'],
    'gcp': ['google cloud', 'google cloud platform'],
    'kubernetes': ['k8s', 'container orchestration'],
    'docker': ['containerization', 'containers'],
    'devops': ['dev ops', 'ci/cd', 'deployment', 'infrastructure'],
    
    // Data & AI
    'machine learning': ['ml', 'deep learning', 'neural networks', 'ai'],
    'data science': ['data analysis', 'data analytics', 'statistics'],
    'ai': ['artificial intelligence', 'machine learning', 'ml'],
    'database': ['db', 'sql', 'nosql', 'data storage'],
    
    // Roles
    'developer': ['dev', 'programmer', 'coder', 'engineer'],
    'software': ['software development', 'software engineering', 'programming'],
    'fullstack': ['full-stack', 'full stack'],
    'lead': ['team lead', 'tech lead', 'technical lead'],
    'senior': ['sr', 'experienced', 'advanced'],
    'junior': ['jr', 'entry level', 'beginner'],
  };

  private roleExpansions: Record<string, string[]> = {
    'developer': ['engineer', 'programmer', 'dev'],
    'engineer': ['developer', 'programmer'],
    'designer': ['ux designer', 'ui designer', 'product designer'],
    'manager': ['mgr', 'team lead', 'supervisor'],
    'architect': ['technical architect', 'solution architect', 'software architect'],
    'analyst': ['business analyst', 'data analyst', 'systems analyst'],
    'scientist': ['researcher', 'data scientist'],
  };

  private conceptRelations: Record<string, string[]> = {
    // Related concepts (not synonyms, but often go together)
    'react': ['javascript', 'frontend', 'spa', 'component', 'jsx'],
    'backend': ['api', 'database', 'server', 'microservices'],
    'frontend': ['ui', 'ux', 'responsive', 'web', 'browser'],
    'mobile': ['ios', 'android', 'react native', 'flutter'],
    'devops': ['deployment', 'ci/cd', 'infrastructure', 'automation'],
    'agile': ['scrum', 'kanban', 'sprint', 'iteration'],
  };

  expandTerm(term: string): ExpandedTerms {
    const lowerTerm = term.toLowerCase();
    
    return {
      original: term,
      expansions: this.getExpansions(lowerTerm),
      related: this.getRelatedTerms(lowerTerm),
      synonyms: this.getSynonyms(lowerTerm),
    };
  }

  expandAllTerms(terms: string[]): ExpandedTerms[] {
    return terms.map(term => this.expandTerm(term));
  }

  getAllSearchTerms(term: string): string[] {
    const expanded = this.expandTerm(term);
    const allTerms = new Set([
      expanded.original,
      ...expanded.expansions,
      ...expanded.related,
      ...expanded.synonyms,
    ]);
    return Array.from(allTerms);
  }

  private getExpansions(term: string): string[] {
    // Check skill expansions
    if (this.skillExpansions[term]) {
      return this.skillExpansions[term];
    }
    
    // Check role expansions
    if (this.roleExpansions[term]) {
      return this.roleExpansions[term];
    }
    
    // Check if term is a value in expansions (reverse lookup)
    for (const [key, values] of Object.entries(this.skillExpansions)) {
      if (values.includes(term)) {
        return [key, ...values.filter(v => v !== term)];
      }
    }
    
    return [];
  }

  private getRelatedTerms(term: string): string[] {
    return this.conceptRelations[term] || [];
  }

  private getSynonyms(term: string): string[] {
    // For now, synonyms are handled in expansions
    // This could be extended with a proper synonym dictionary
    return [];
  }

  // Special method for expanding software development related queries
  expandSoftwareQuery(query: string): string[] {
    const baseTerms = [
      'software', 'development', 'programming', 'coding',
      'engineer', 'developer', 'programmer', 'coder',
      'application', 'app', 'system', 'platform',
    ];
    
    // If query mentions specific technologies, add those
    const techMatches = query.match(/\b(web|mobile|desktop|cloud|api|frontend|backend)\b/gi);
    if (techMatches) {
      baseTerms.push(...techMatches.map(t => t.toLowerCase()));
    }
    
    return baseTerms;
  }
}