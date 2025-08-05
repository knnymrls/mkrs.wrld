'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  GitBranch,
  Zap,
  Shield,
  Target
} from 'lucide-react';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  profileCount: number;
  postCount: number;
  projectCount: number;
  avgConnections: number;
  mostConnected: any;
}

interface IntelligenceMetrics {
  knowledgeHealthScore: number;
  collaborationIndex: number;
  expertiseCoverage: number;
  innovationIndicator: number;
  riskAlerts: string[];
  opportunities: string[];
}

interface GraphIntelligenceProps {
  stats: GraphStats;
  metrics?: IntelligenceMetrics;
  mode: string;
}

export default function GraphIntelligence({ stats, metrics, mode }: GraphIntelligenceProps) {
  // Mock metrics for demonstration - in production, these would come from API
  const mockMetrics: IntelligenceMetrics = metrics || {
    knowledgeHealthScore: 78,
    collaborationIndex: 65,
    expertiseCoverage: 82,
    innovationIndicator: 71,
    riskAlerts: [
      "Only 1 person knows Kubernetes",
      "3 isolated experts detected",
      "Frontend skills concentrated in specific groups"
    ],
    opportunities: [
      "5 people interested in GraphQL",
      "Cross-functional ML collaboration potential",
      "Mentorship opportunity: React expertise"
    ]
  };

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    change, 
    color 
  }: { 
    icon: any, 
    label: string, 
    value: number | string, 
    change?: number,
    color: string 
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${
            change > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className="w-3 h-3" />
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {typeof value === 'number' ? `${value}%` : value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </motion.div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 transform transition-transform duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Collapsed View Toggle */}
        <button className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-2 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Activity className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-12 gap-4">
          {/* Metrics Grid */}
          <div className="col-span-8 grid grid-cols-4 gap-3">
            <MetricCard
              icon={Shield}
              label="Knowledge Health"
              value={mockMetrics.knowledgeHealthScore}
              change={5}
              color="bg-green-500"
            />
            <MetricCard
              icon={GitBranch}
              label="Collaboration Index"
              value={mockMetrics.collaborationIndex}
              change={-2}
              color="bg-blue-500"
            />
            <MetricCard
              icon={Target}
              label="Expertise Coverage"
              value={mockMetrics.expertiseCoverage}
              change={3}
              color="bg-purple-500"
            />
            <MetricCard
              icon={Zap}
              label="Innovation Score"
              value={mockMetrics.innovationIndicator}
              change={8}
              color="bg-yellow-500"
            />
          </div>

          {/* Alerts & Opportunities */}
          <div className="col-span-4 grid grid-cols-2 gap-3">
            {/* Risk Alerts */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Risk Alerts
                </span>
              </div>
              <div className="space-y-2">
                {mockMetrics.riskAlerts.slice(0, 2).map((alert, i) => (
                  <div key={i} className="text-xs text-red-700 dark:text-red-300">
                    • {alert}
                  </div>
                ))}
                {mockMetrics.riskAlerts.length > 2 && (
                  <button className="text-xs text-red-600 dark:text-red-400 hover:underline">
                    +{mockMetrics.riskAlerts.length - 2} more
                  </button>
                )}
              </div>
            </div>

            {/* Opportunities */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-900 dark:text-green-200">
                  Opportunities
                </span>
              </div>
              <div className="space-y-2">
                {mockMetrics.opportunities.slice(0, 2).map((opp, i) => (
                  <div key={i} className="text-xs text-green-700 dark:text-green-300">
                    • {opp}
                  </div>
                ))}
                {mockMetrics.opportunities.length > 2 && (
                  <button className="text-xs text-green-600 dark:text-green-400 hover:underline">
                    +{mockMetrics.opportunities.length - 2} more
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3" />
              <span>{stats.profileCount} people</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3" />
              <span>{stats.avgConnections} avg connections</span>
            </div>
            {stats.mostConnected && (
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span>Top connector: {stats.mostConnected.label}</span>
              </div>
            )}
          </div>
          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View detailed report →
          </button>
        </div>
      </div>
    </div>
  );
}