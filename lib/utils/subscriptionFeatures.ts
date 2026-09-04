/**
 * Subscription Feature Definitions and Access Control
 * 
 * This file defines which features are available for each subscription plan
 * and provides utility functions to check feature access.
 */

export type SubscriptionPlan = 'free' | 'pro' | 'ultimate';

export interface PlanFeatures {
  // Profile & Networking
  maxConnections: number; // -1 for unlimited
  maxPostsPerMonth: number; // -1 for unlimited
  
  // Analytics
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  
  // Support
  communitySupport: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  
  // Profile Features
  premiumBadge: boolean;
  enhancedCustomization: boolean;
  customBranding: boolean;
  featuredProfile: boolean; // Appears higher in search results
  featuredPriority: number; // Higher number = higher priority (0 = not featured)
  
  // File & Storage
  fileUploads: boolean; // CVs, documents, portfolio items
  maxStorageMB: number;
  
  // Content Features
  postScheduling: boolean;
  richReactions: boolean; // All reaction types vs just like
  dataExport: boolean;
  
  // Advanced Features
  apiAccess: boolean;
  earlyAccess: boolean;
  whiteLabel: boolean;
  customIntegrations: boolean;
  bulkOperations: boolean;
  customDomain: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    // Profile & Networking
    maxConnections: 100,
    maxPostsPerMonth: 50,
    
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: false,
    
    // Support
    communitySupport: true,
    prioritySupport: false,
    dedicatedSupport: false,
    
    // Profile Features
    premiumBadge: false,
    enhancedCustomization: false,
    customBranding: false,
    featuredProfile: false,
    featuredPriority: 0,
    
    // File & Storage
    fileUploads: false, // Only profile pictures and post images
    maxStorageMB: 50,
    
    // Content Features
    postScheduling: false,
    richReactions: false, // Only basic "like" reaction
    dataExport: false,
    
    // Advanced Features
    apiAccess: false,
    earlyAccess: false,
    whiteLabel: false,
    customIntegrations: false,
    bulkOperations: false,
    customDomain: false,
  },
  
  pro: {
    // Profile & Networking
    maxConnections: -1, // Unlimited
    maxPostsPerMonth: -1, // Unlimited
    
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: true,
    
    // Support
    communitySupport: true,
    prioritySupport: true,
    dedicatedSupport: false,
    
    // Profile Features
    premiumBadge: true,
    enhancedCustomization: true,
    customBranding: false,
    featuredProfile: true,
    featuredPriority: 50, // Pro gets medium priority
    
    // File & Storage
    fileUploads: true,
    maxStorageMB: 500,
    
    // Content Features
    postScheduling: true,
    richReactions: true,
    dataExport: true,
    
    // Advanced Features
    apiAccess: false,
    earlyAccess: true,
    whiteLabel: false,
    customIntegrations: false,
    bulkOperations: false,
    customDomain: false,
  },
  
  ultimate: {
    // Profile & Networking
    maxConnections: -1, // Unlimited
    maxPostsPerMonth: -1, // Unlimited
    
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: true,
    
    // Support
    communitySupport: true,
    prioritySupport: true,
    dedicatedSupport: true,
    
    // Profile Features
    premiumBadge: true,
    enhancedCustomization: true,
    customBranding: true,
    featuredProfile: true,
    featuredPriority: 100, // Ultimate gets highest priority
    
    // File & Storage
    fileUploads: true,
    maxStorageMB: 5120, // 5 GB
    
    // Content Features
    postScheduling: true,
    richReactions: true,
    dataExport: true,
    
    // Advanced Features
    apiAccess: true,
    earlyAccess: true,
    whiteLabel: true,
    customIntegrations: true,
    bulkOperations: true,
    customDomain: true,
  },
};

/**
 * Check if a user has access to a specific feature
 * If subscription is suspended and plan is pro/ultimate, user gets free plan features
 */
export function hasFeatureAccess(
  userPlan: SubscriptionPlan | string | null | undefined,
  feature: keyof PlanFeatures,
  subscriptionStatus?: string | null
): boolean {
  // If suspended and plan is pro/ultimate, use free plan features
  const effectivePlan = (subscriptionStatus === 'suspended' && (userPlan === 'pro' || userPlan === 'ultimate'))
    ? 'free'
    : (userPlan || 'free');
  const plan = effectivePlan as SubscriptionPlan;
  const features = PLAN_FEATURES[plan];
  return features[feature] === true || features[feature] > 0;
}

/**
 * Get the maximum value for a numeric feature (connections, posts, storage)
 * If subscription is suspended and plan is pro/ultimate, user gets free plan limits
 */
export function getFeatureLimit(
  userPlan: SubscriptionPlan | string | null | undefined,
  feature: 'maxConnections' | 'maxPostsPerMonth' | 'maxStorageMB',
  subscriptionStatus?: string | null
): number {
  // If suspended and plan is pro/ultimate, use free plan limits
  const effectivePlan = (subscriptionStatus === 'suspended' && (userPlan === 'pro' || userPlan === 'ultimate'))
    ? 'free'
    : (userPlan || 'free');
  const plan = effectivePlan as SubscriptionPlan;
  return PLAN_FEATURES[plan][feature];
}

/**
 * Check if user can perform an action (e.g., create post, add connection)
 * If subscription is suspended and plan is pro/ultimate, user gets free plan permissions
 */
export function canPerformAction(
  userPlan: SubscriptionPlan | string | null | undefined,
  action: 'createPost' | 'addConnection' | 'uploadFile' | 'schedulePost' | 'exportData' | 'useAPI',
  subscriptionStatus?: string | null
): boolean {
  // If suspended and plan is pro/ultimate, use free plan permissions
  const effectivePlan = (subscriptionStatus === 'suspended' && (userPlan === 'pro' || userPlan === 'ultimate'))
    ? 'free'
    : (userPlan || 'free');
  const plan = effectivePlan as SubscriptionPlan;
  const features = PLAN_FEATURES[plan];
  
  switch (action) {
    case 'createPost':
      return features.maxPostsPerMonth === -1 || features.maxPostsPerMonth > 0;
    case 'addConnection':
      return features.maxConnections === -1 || features.maxConnections > 0;
    case 'uploadFile':
      return features.fileUploads;
    case 'schedulePost':
      return features.postScheduling;
    case 'exportData':
      return features.dataExport;
    case 'useAPI':
      return features.apiAccess;
    default:
      return false;
  }
}

/**
 * Get user's current plan features
 * If subscription is suspended and plan is pro/ultimate, user gets free plan features
 */
export function getUserPlanFeatures(
  userPlan: SubscriptionPlan | string | null | undefined,
  subscriptionStatus?: string | null
): PlanFeatures {
  // If suspended and plan is pro/ultimate, use free plan features
  const effectivePlan = (subscriptionStatus === 'suspended' && (userPlan === 'pro' || userPlan === 'ultimate'))
    ? 'free'
    : (userPlan || 'free');
  const plan = effectivePlan as SubscriptionPlan;
  return PLAN_FEATURES[plan];
}

