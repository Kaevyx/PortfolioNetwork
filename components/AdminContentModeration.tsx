"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
// Removed getDefaultMessage imports - now using database categories
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Shield,
  Globe,
  FileText,
  Save,
  XCircle,
  TestTube,
  ClipboardList,
  User,
  Clock,
  Eye,
  TrendingUp,
  AlertTriangle,
  Ban
} from "lucide-react";

interface BlockedKeyword {
  id: string;
  keyword: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  match_type: 'exact' | 'contains' | 'regex';
  custom_message: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface BlockedDomain {
  id: string;
  domain: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  custom_message: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface ModerationCategory {
  id: string;
  name: string;
  display_name: string;
  default_message: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

const severityConfig = {
  low: { label: 'Low', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  high: { label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

interface AdminContentModerationProps {
  supabase: ReturnType<typeof createClient>;
  currentUserId: string;
}

interface BlockedAttempt {
  id: string;
  user_id: string;
  user_email?: string;
  user_username?: string;
  content_type: 'post' | 'comment' | 'share_comment' | 'message' | 'other';
  attempted_content: string;
  matched_keyword?: string;
  matched_domain?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  message_shown?: string;
  context_url?: string;
  warning_id?: string;
  warning_acknowledged?: boolean;
  is_suspended?: boolean;
  created_at: string;
}

export function AdminContentModeration({ supabase, currentUserId }: AdminContentModerationProps) {
  const [activeTab, setActiveTab] = useState<'keywords' | 'domains' | 'categories' | 'checker' | 'attempts'>('keywords');
  const [keywords, setKeywords] = useState<BlockedKeyword[]>([]);
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [categories, setCategories] = useState<ModerationCategory[]>([]);
  const [attempts, setAttempts] = useState<BlockedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAttemptUser, setFilterAttemptUser] = useState<string>('');
  const [filterAttemptType, setFilterAttemptType] = useState<string>('all');
  const [filterAttemptCategory, setFilterAttemptCategory] = useState<string>('all');
  const [filterAttemptSeverity, setFilterAttemptSeverity] = useState<string>('all');
  const [attemptStats, setAttemptStats] = useState<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    topCategory: string | null;
    topSeverity: string | null;
  } | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<BlockedAttempt | null>(null);
  const [showAttemptModal, setShowAttemptModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [suspensionDays, setSuspensionDays] = useState<number>(1);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<BlockedKeyword | null>(null);
  const [editingDomain, setEditingDomain] = useState<BlockedDomain | null>(null);
  const [editingCategory, setEditingCategory] = useState<ModerationCategory | null>(null);
  
  // Content checker state
  const [checkerText, setCheckerText] = useState('');
  const [checkerResult, setCheckerResult] = useState<{
    isSafe: boolean;
    reason?: string;
    category?: string;
    matchedKeyword?: string;
    matchedDomain?: string;
    message?: string;
    severity?: 'low' | 'medium' | 'high';
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const [keywordFormData, setKeywordFormData] = useState({
    keyword: '',
    category: 'other',
    severity: 'medium' as 'low' | 'medium' | 'high',
    match_type: 'contains' as 'exact' | 'contains' | 'regex',
    custom_message: '',
    is_active: true,
  });

  const [domainFormData, setDomainFormData] = useState({
    domain: '',
    category: 'other',
    severity: 'high' as 'low' | 'medium' | 'high',
    custom_message: '',
    is_active: true,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    display_name: '',
    default_message: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadData();
    loadCategories();
    if (activeTab === 'attempts') {
      loadAttempts();
    }
  }, [activeTab, filterAttemptUser, filterAttemptType, filterAttemptCategory, filterAttemptSeverity]);

  // Listen for warning acknowledgments and user suspensions
  useEffect(() => {
    if (activeTab !== 'attempts') return;

    const notificationsChannel = supabase
      .channel('warning-acknowledgments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `type=eq.warning_acknowledged`,
        },
        (payload) => {
          // Refresh attempts when a warning is acknowledged
          loadAttempts();
        }
      )
      .subscribe();

    const warningsChannel = supabase
      .channel('content-warnings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_warnings',
        },
        (payload) => {
          // Refresh attempts when a warning is updated (acknowledged)
          loadAttempts();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('user-suspensions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `is_suspended=eq.true`,
        },
        (payload) => {
          // Refresh attempts when a user is suspended
          loadAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(warningsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [activeTab, supabase]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_categories')
        .select('*')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error loading categories:", error);
    }
  };

  const loadAttempts = async () => {
    setLoadingAttempts(true);
    try {
      // If searching by user, find the user ID first
      let userId: string | null = null;
      if (filterAttemptUser.trim()) {
        const searchTerm = `%${filterAttemptUser.trim()}%`;
        const { data: userData } = await supabase
          .from('profiles')
          .select('clerk_id')
          .or(`email.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .limit(1)
          .maybeSingle();
        userId = userData?.clerk_id || null;
      }
      
      const { data, error } = await supabase
        .rpc('get_blocked_content_attempts', {
          p_limit: 1000,
          p_offset: 0,
          p_user_id: userId,
          p_content_type: filterAttemptType !== 'all' ? filterAttemptType : null,
          p_category: filterAttemptCategory !== 'all' ? filterAttemptCategory : null,
          p_severity: filterAttemptSeverity !== 'all' ? filterAttemptSeverity : null,
        });
      
      if (error) throw error;
      
      // Enrich attempts with warning acknowledgment and suspension status
      const enrichedAttempts = await Promise.all((data || []).map(async (attempt: any) => {
        let warningAcknowledged = false;
        let isSuspended = false;
        
        // Check if warning is acknowledged
        if (attempt.warning_id) {
          const { data: warningData } = await supabase
            .from('content_warnings')
            .select('is_acknowledged')
            .eq('id', attempt.warning_id)
            .maybeSingle();
          warningAcknowledged = warningData?.is_acknowledged || false;
        }
        
        // Check if user is suspended
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('clerk_id', attempt.user_id)
          .maybeSingle();
        isSuspended = userProfile?.is_suspended || false;
        
        return {
          ...attempt,
          warning_acknowledged: warningAcknowledged,
          is_suspended: isSuspended,
        };
      }));
      
      setAttempts(enrichedAttempts);
      
      // Load stats
      await loadAttemptStats();
    } catch (error: any) {
      console.error("Error loading attempts:", error);
      alert("Failed to load blocked attempts: " + error.message);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const loadAttemptStats = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data, error } = await supabase
        .from('blocked_content_attempts')
        .select('category, severity, created_at');

      if (error) throw error;

      const total = data?.length || 0;
      const todayCount = data?.filter(a => new Date(a.created_at) >= today).length || 0;
      const weekCount = data?.filter(a => new Date(a.created_at) >= weekAgo).length || 0;
      const monthCount = data?.filter(a => new Date(a.created_at) >= monthAgo).length || 0;

      // Find top category
      const categoryCounts: Record<string, number> = {};
      data?.forEach(a => {
        if (a.category) {
          categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
        }
      });
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Find top severity
      const severityCounts: Record<string, number> = {};
      data?.forEach(a => {
        if (a.severity) {
          severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
        }
      });
      const topSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      setAttemptStats({
        total,
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        topCategory,
        topSeverity,
      });
    } catch (error: any) {
      console.error("Error loading attempt stats:", error);
    }
  };

  const handleWarnUser = async (attempt?: BlockedAttempt) => {
    const targetAttempt = attempt || selectedAttempt;
    if (!targetAttempt || !actionNotes.trim()) {
      alert("Please provide a warning message.");
      return;
    }

    setActionLoading(true);
    try {
      // Create warning record
      const { data: warningData, error: warningError } = await supabase
        .from('content_warnings')
        .insert({
          user_id: targetAttempt.user_id,
          blocked_attempt_id: targetAttempt.id,
          warning_message: actionNotes.trim(), // Custom message from admin
          category: targetAttempt.category,
          severity: targetAttempt.severity || 'medium',
          issued_by: currentUserId,
          is_active: true,
        })
        .select()
        .single();

      if (warningError) throw warningError;

      // Update blocked attempt to link to warning
      await supabase
        .from('blocked_content_attempts')
        .update({ warning_id: warningData.id })
        .eq('id', targetAttempt.id);

      // Log admin action
      const logResponse = await fetch("/api/log-admin-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "warning_issued",
          targetUserId: targetAttempt.user_id,
          targetId: targetAttempt.id,
          details: {
            blockedAttemptId: targetAttempt.id,
            warningId: warningData.id,
            attemptedContent: targetAttempt.attempted_content,
            category: targetAttempt.category,
            warningMessage: actionNotes.trim(),
          },
        }),
      });

      if (!logResponse.ok) {
        throw new Error("Failed to log admin action");
      }

      // Log to user account history
      const { error: historyError } = await supabase.rpc("log_user_account_history", {
        p_user_id: targetAttempt.user_id,
        p_action_type: "admin_action",
        p_performed_by: currentUserId,
        p_details: {
          action: "warning_issued",
          blockedAttemptId: targetAttempt.id,
          warningId: warningData.id,
          attemptedContent: targetAttempt.attempted_content,
          category: targetAttempt.category,
          contentType: targetAttempt.content_type,
          warningMessage: actionNotes.trim(),
        },
      });

      if (historyError) {
        console.error("Error logging to account history:", historyError);
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: targetAttempt.user_id,
        type: "admin_warning",
        actor_id: currentUserId,
        target_id: warningData.id,
        message: actionNotes.trim(), // Use the custom message
      });

      alert("Warning issued successfully! The user will see this as a banner on their dashboard.");
      setShowWarnModal(false);
      setShowAttemptModal(false);
      setActionNotes('');
      setSelectedAttempt(null);
      await loadAttempts(); // Refresh to show warning status
    } catch (error: any) {
      console.error("Error warning user:", error);
      alert("Failed to warn user: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (attempt?: BlockedAttempt) => {
    const targetAttempt = attempt || selectedAttempt;
    if (!targetAttempt || !actionNotes.trim()) {
      alert("Please provide a reason for the suspension.");
      return;
    }

    if (!confirm(`Are you sure you want to suspend this user for ${suspensionDays} day(s)?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetAttempt.user_id,
          reason: actionNotes.trim(),
          durationDays: suspensionDays,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to suspend user");
      }

      alert("User suspended successfully!");
      setShowSuspendModal(false);
      setShowAttemptModal(false);
      setActionNotes('');
      setSuspensionDays(1);
      setSelectedAttempt(null);
      await loadAttempts(); // Refresh to show suspension status
    } catch (error: any) {
      console.error("Error suspending user:", error);
      alert("Failed to suspend user: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'keywords') {
        const { data, error } = await supabase
          .from('blocked_keywords')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setKeywords(data || []);
      } else {
        const { data, error } = await supabase
          .from('blocked_domains')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setDomains(data || []);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      alert("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate that the selected category exists in moderation_categories
      const selectedCategory = categories.find(cat => cat.name === keywordFormData.category);
      if (!selectedCategory || !selectedCategory.is_active) {
        alert(`The selected category "${keywordFormData.category}" is not valid or is inactive. Please select a valid category.`);
        return;
      }
      
      if (editingKeyword) {
        const { error } = await supabase
          .from('blocked_keywords')
          .update({
            ...keywordFormData,
            category: keywordFormData.category.trim(), // Ensure no extra spaces
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingKeyword.id);
        
        if (error) {
          // Check for constraint violations
          if (error.code === '23514' || error.message.includes('check constraint')) {
            alert(`Invalid category "${keywordFormData.category}". The category may not exist in the database. Please select a valid category from the list.`);
            return;
          }
          throw error;
        }
      } else {
        // Check if keyword already exists with same match_type and is active
        const { data: existing } = await supabase
          .from('blocked_keywords')
          .select('id, keyword, match_type, is_active')
          .eq('keyword', keywordFormData.keyword.trim())
          .eq('match_type', keywordFormData.match_type)
          .eq('is_active', true)
          .maybeSingle();
        
        if (existing) {
          alert(`A keyword "${keywordFormData.keyword}" with match type "${keywordFormData.match_type}" already exists and is active. Please edit the existing keyword or deactivate it first.`);
          return;
        }
        
        const { error } = await supabase
          .from('blocked_keywords')
          .insert({
            ...keywordFormData,
            category: keywordFormData.category.trim(), // Ensure no extra spaces
            created_by: currentUserId,
          });
        
        if (error) {
          // Check if it's a unique constraint violation
          if (error.code === '23505' || error.message.includes('duplicate key')) {
            alert(`A keyword "${keywordFormData.keyword}" with match type "${keywordFormData.match_type}" already exists. Please check for existing keywords or edit the existing one.`);
            return;
          }
          // Check for constraint violations (invalid category)
          if (error.code === '23514' || error.message.includes('check constraint')) {
            alert(`Invalid category "${keywordFormData.category}". The category may not exist in the database. Please select a valid category from the list.`);
            return;
          }
          throw error;
        }
      }
      
      await loadData();
      resetKeywordForm();
      setShowKeywordModal(false);
      
      // Clear moderation cache so changes take effect immediately
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }

      // If on checker tab, re-check the content after a short delay
      if (activeTab === 'checker' && checkerText.trim()) {
        setTimeout(() => {
          handleCheckContent();
        }, 300);
      }
    } catch (error: any) {
      console.error("Error saving keyword:", error);
      alert("Failed to save keyword: " + error.message);
    }
  };

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDomain) {
        const { error } = await supabase
          .from('blocked_domains')
          .update({
            ...domainFormData,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDomain.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blocked_domains')
          .insert({
            ...domainFormData,
            created_by: currentUserId,
          });
        
        if (error) throw error;
      }
      
      await loadData();
      resetDomainForm();
      setShowDomainModal(false);
      
      // Clear moderation cache so changes take effect immediately
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }

      // If on checker tab, re-check the content after a short delay
      if (activeTab === 'checker' && checkerText.trim()) {
        setTimeout(() => {
          handleCheckContent();
        }, 300);
      }
    } catch (error: any) {
      console.error("Error saving domain:", error);
      alert("Failed to save domain: " + error.message);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm("Are you sure you want to delete this keyword?")) return;
    
    try {
      const { error } = await supabase
        .from('blocked_keywords')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadData();
      
      // Clear moderation cache
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }
    } catch (error: any) {
      console.error("Error deleting keyword:", error);
      alert("Failed to delete keyword: " + error.message);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;
    
    try {
      const { error } = await supabase
        .from('blocked_domains')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadData();
      
      // Clear moderation cache
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }
    } catch (error: any) {
      console.error("Error deleting domain:", error);
      alert("Failed to delete domain: " + error.message);
    }
  };

  const handleToggleActive = async (type: 'keyword' | 'domain', id: string, currentStatus: boolean) => {
    try {
      const table = type === 'keyword' ? 'blocked_keywords' : 'blocked_domains';
      const { error } = await supabase
        .from(table)
        .update({
          is_active: !currentStatus,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      await loadData();
      
      // Clear moderation cache
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      alert("Failed to update status: " + error.message);
    }
  };

  const resetKeywordForm = () => {
    setKeywordFormData({
      keyword: '',
      category: 'other',
      severity: 'medium',
      match_type: 'contains',
      custom_message: '',
      is_active: true,
    });
    setEditingKeyword(null);
  };

  const resetDomainForm = () => {
    setDomainFormData({
      domain: '',
      category: 'other',
      severity: 'high',
      custom_message: '',
      is_active: true,
    });
    setEditingDomain(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      display_name: '',
      default_message: '',
      is_active: true,
      display_order: 0,
    });
    setEditingCategory(null);
  };

  // Get sorted categories for dropdowns (global - same for both keywords and domains)
  const getCategories = () => {
    return categories
      .filter(cat => cat.is_active)
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map(cat => ({ value: cat.name, label: cat.display_name }));
  };

  // Get default message for a category (works for both keywords and domains)
  const getCategoryDefaultMessage = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.default_message || 'This content violates our community guidelines.';
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate name format (lowercase, underscores only)
      const nameRegex = /^[a-z][a-z0-9_]*$/;
      if (!nameRegex.test(categoryFormData.name)) {
        alert('Category name must be lowercase, start with a letter, and contain only letters, numbers, and underscores.');
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('moderation_categories')
          .update({
            display_name: categoryFormData.display_name,
            default_message: categoryFormData.default_message,
            is_active: categoryFormData.is_active,
            display_order: categoryFormData.display_order,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
      } else {
        // Check if category name already exists
        const { data: existing } = await supabase
          .from('moderation_categories')
          .select('id')
          .eq('name', categoryFormData.name)
          .single();
        
        if (existing) {
          alert('A category with this name already exists.');
          return;
        }

        const { error } = await supabase
          .from('moderation_categories')
          .insert({
            name: categoryFormData.name,
            display_name: categoryFormData.display_name,
            default_message: categoryFormData.default_message,
            is_active: categoryFormData.is_active,
            display_order: categoryFormData.display_order,
            created_by: currentUserId,
          });
        
        if (error) throw error;
      }
      
      await loadCategories();
      resetCategoryForm();
      setShowCategoryModal(false);
      
      // Clear moderation cache (including category messages)
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }

      // If on checker tab, re-check the content after a short delay
      if (activeTab === 'checker' && checkerText.trim()) {
        setTimeout(() => {
          handleCheckContent();
        }, 300);
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      alert("Failed to save category: " + error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This will affect all keywords/domains using this category.")) return;
    
    try {
      const category = categories.find(c => c.id === id);
      if (!category) {
        alert('Category not found.');
        return;
      }

      // Check if category is in use
      const { count: keywordCount } = await supabase
        .from('blocked_keywords')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.name);
      
      const { count: domainCount } = await supabase
        .from('blocked_domains')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.name);
      
      if ((keywordCount || 0) > 0 || (domainCount || 0) > 0) {
        alert('Cannot delete category that is in use. Please deactivate it instead or reassign all keywords/domains.');
        return;
      }

      const { error } = await supabase
        .from('moderation_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadCategories();
      
      // Clear moderation cache
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category: " + error.message);
    }
  };

  const handleEditCategory = (category: ModerationCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      display_name: category.display_name,
      default_message: category.default_message,
      is_active: category.is_active,
      display_order: category.display_order,
    });
    setShowCategoryModal(true);
  };

  const handleToggleCategoryActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('moderation_categories')
        .update({
          is_active: !currentStatus,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      await loadCategories();
      
      // Clear moderation cache
      try {
        const { clearModerationCache } = await import('@/lib/utils/databaseContentModeration');
        clearModerationCache();
      } catch (error) {
        console.warn("Could not clear moderation cache:", error);
      }
    } catch (error: any) {
      console.error("Error toggling category status:", error);
      alert("Failed to update category status: " + error.message);
    }
  };

  const handleCheckContent = async () => {
    if (!checkerText.trim()) {
      setCheckerResult(null);
      return;
    }

    setChecking(true);
    try {
      // Import functions dynamically
      const { checkBlockedKeywords, checkBlockedDomains } = await import('@/lib/utils/databaseContentModeration');
      
      // Check both keywords and domains
      const keywordCheck = await checkBlockedKeywords(checkerText);
      const domainCheck = await checkBlockedDomains(checkerText);
      
      const isBlocked = keywordCheck.found || domainCheck.found;
      
      if (isBlocked) {
        // Determine which one matched (keywords take priority for message)
        const matchedKeyword = keywordCheck.found ? keywordCheck.keyword : undefined;
        const matchedDomain = domainCheck.found ? domainCheck.domain : undefined;
        const message = keywordCheck.found ? keywordCheck.message : domainCheck.message;
        const severity = keywordCheck.found ? keywordCheck.severity : domainCheck.severity;
        const category = keywordCheck.found ? keywordCheck.category : domainCheck.category;

        setCheckerResult({
          isSafe: false,
          reason: message || 'Content violates community guidelines',
          category,
          matchedKeyword,
          matchedDomain,
          message,
          severity,
        });
      } else {
        setCheckerResult({
          isSafe: true,
        });
      }
    } catch (error: any) {
      console.error("Error checking content:", error);
      setCheckerResult({
        isSafe: false,
        reason: "Error checking content: " + error.message,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleEditKeyword = (keyword: BlockedKeyword) => {
    setEditingKeyword(keyword);
    setKeywordFormData({
      keyword: keyword.keyword,
      category: keyword.category,
      severity: keyword.severity,
      match_type: keyword.match_type,
      custom_message: keyword.custom_message || '',
      is_active: keyword.is_active,
    });
    setShowKeywordModal(true);
  };

  const handleEditDomain = (domain: BlockedDomain) => {
    setEditingDomain(domain);
    setDomainFormData({
      domain: domain.domain,
      category: domain.category,
      severity: domain.severity,
      custom_message: domain.custom_message || '',
      is_active: domain.is_active,
    });
    setShowDomainModal(true);
  };

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = !searchTerm || k.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || k.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || k.severity === filterSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const filteredDomains = domains.filter(d => {
    const matchesSearch = !searchTerm || d.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || d.severity === filterSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Moderation</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage blocked keywords and domains
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('keywords');
              setSearchTerm('');
              setFilterCategory('all');
              setFilterSeverity('all');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'keywords'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blocked Keywords
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('domains');
              setSearchTerm('');
              setFilterCategory('all');
              setFilterSeverity('all');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'domains'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Blocked Domains
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('categories');
              setSearchTerm('');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Categories
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('checker');
              setCheckerText('');
              setCheckerResult(null);
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'checker'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Content Checker
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('attempts');
              loadAttempts();
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'attempts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Blocked Attempts
            </div>
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      {activeTab !== 'categories' && activeTab !== 'checker' && activeTab !== 'attempts' && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'keywords' ? 'keywords' : 'domains'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
            {getCategories().map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'keywords') {
                resetKeywordForm();
                setShowKeywordModal(true);
              } else {
                resetDomainForm();
                setShowDomainModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === 'keywords' ? 'Keyword' : 'Domain'}
          </button>
        </div>
      )}

      {/* Categories Tab - Filters and Actions */}
      {activeTab === 'categories' && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      )}

      {/* Keywords Table */}
      {activeTab === 'keywords' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keyword</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Match Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredKeywords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No keywords found
                    </td>
                  </tr>
                ) : (
                  filteredKeywords.map((keyword) => (
                    <tr key={keyword.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 min-w-[300px] max-w-[400px]">
                        <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{keyword.keyword}</div>
                        {keyword.custom_message ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{keyword.custom_message}</div>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-1 break-words">
                            <span className="text-gray-400 dark:text-gray-500">Default: </span>
                            {getCategoryDefaultMessage(keyword.category)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getCategories().find(c => c.value === keyword.category)?.label || keyword.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{keyword.match_type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConfig[keyword.severity].color}`}>
                          {severityConfig[keyword.severity].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                        <button
                          onClick={() => handleToggleActive('keyword', keyword.id, keyword.is_active)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            keyword.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {keyword.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditKeyword(keyword)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(keyword.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Domains Table */}
      {activeTab === 'domains' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDomains.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No domains found
                    </td>
                  </tr>
                ) : (
                  filteredDomains.map((domain) => (
                    <tr key={domain.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 min-w-[300px] max-w-[450px]">
                        <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{domain.domain}</div>
                        {domain.custom_message ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{domain.custom_message}</div>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-1 break-words">
                            <span className="text-gray-400 dark:text-gray-500">Default: </span>
                            {getCategoryDefaultMessage(domain.category)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getCategories().find(c => c.value === domain.category)?.label || domain.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConfig[domain.severity].color}`}>
                          {severityConfig[domain.severity].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                        <button
                          onClick={() => handleToggleActive('domain', domain.id, domain.is_active)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            domain.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {domain.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditDomain(domain)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(domain.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Table */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Display Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Default Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories
                  .filter(cat => {
                    const matchesSearch = !searchTerm || 
                      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      cat.display_name.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  })
                  .length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories
                    .filter(cat => {
                      const matchesSearch = !searchTerm || 
                        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        cat.display_name.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesSearch;
                    })
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{category.display_name}</div>
                        </td>
                        <td className="px-6 py-4 min-w-[300px] max-w-[400px]">
                          <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{category.default_message}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCategoryActive(category.id, category.is_active)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              category.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {category.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Checker Tab */}
      {activeTab === 'checker' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Test Content Moderation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter text to check if it would be blocked by the moderation system. This shows exactly what users would see if they tried to post this content.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content to Check
                </label>
                <textarea
                  value={checkerText}
                  onChange={(e) => {
                    setCheckerText(e.target.value);
                    setCheckerResult(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleCheckContent();
                    }
                  }}
                  placeholder="Enter text, keywords, phrases, or URLs to test..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white min-h-[120px]"
                  rows={5}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Press Ctrl+Enter (or Cmd+Enter on Mac) to check
                </p>
              </div>

              <button
                onClick={handleCheckContent}
                disabled={checking || !checkerText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {checking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Check Content
                  </>
                )}
              </button>

              {checkerResult && (
                <div className={`rounded-lg border-2 p-6 ${
                  checkerResult.isSafe
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {checkerResult.isSafe ? (
                      <Check className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-lg font-semibold ${
                            checkerResult.isSafe
                              ? 'text-green-800 dark:text-green-300'
                              : 'text-red-800 dark:text-red-300'
                          }`}>
                            {checkerResult.isSafe ? 'Content is Safe' : 'Content Would Be Blocked'}
                          </h4>
                          {checkerResult.isSafe && (
                            <button
                              onClick={() => {
                                // Extract potential keyword/phrase from text
                                const textToBlock = checkerText.trim();
                                // Check if it contains a URL
                                const urlPattern = /(https?:\/\/[^\s]+)/gi;
                                const urls = textToBlock.match(urlPattern);
                                
                                if (urls && urls.length > 0) {
                                  // If contains URL, suggest adding as domain
                                  const domain = urls[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0];
                                  setDomainFormData({
                                    domain: domain,
                                    category: 'other',
                                    severity: 'high',
                                    custom_message: '',
                                    is_active: true,
                                  });
                                  setShowDomainModal(true);
                                } else {
                                  // For longer text, try to extract a meaningful phrase
                                  // If text is short (<= 50 chars), use it as-is
                                  // Otherwise, use first sentence or first 50 chars
                                  let keywordToBlock = textToBlock;
                                  if (textToBlock.length > 50) {
                                    // Try to get first sentence
                                    const firstSentence = textToBlock.match(/^[^.!?]+[.!?]?/);
                                    if (firstSentence && firstSentence[0].length <= 100) {
                                      keywordToBlock = firstSentence[0].trim();
                                    } else {
                                      // Otherwise, use first 50 chars
                                      keywordToBlock = textToBlock.substring(0, 50).trim();
                                    }
                                  }
                                  
                                  // Suggest adding as keyword
                                  setKeywordFormData({
                                    keyword: keywordToBlock,
                                    category: 'other',
                                    severity: 'medium',
                                    match_type: 'contains',
                                    custom_message: '',
                                    is_active: true,
                                  });
                                  setShowKeywordModal(true);
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                              title="Add this content as a blocked keyword or domain"
                            >
                              <XCircle className="w-4 h-4" />
                              Block This Content
                            </button>
                          )}
                        </div>
                        {!checkerResult.isSafe && (
                          <div className="space-y-3">
                            {checkerResult.message && (
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Message Shown to User:
                                </p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {checkerResult.message}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {checkerResult.matchedKeyword && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Matched Keyword
                                  </p>
                                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                                    {checkerResult.matchedKeyword}
                                  </p>
                                </div>
                              )}

                              {checkerResult.matchedDomain && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Matched Domain
                                  </p>
                                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                                    {checkerResult.matchedDomain}
                                  </p>
                                </div>
                              )}

                              {checkerResult.category && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Category
                                  </p>
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    {getCategories().find(c => c.value === checkerResult.category)?.label || checkerResult.category}
                                  </p>
                                </div>
                              )}

                              {checkerResult.severity && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Severity
                                  </p>
                                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${severityConfig[checkerResult.severity].color}`}>
                                    {severityConfig[checkerResult.severity].label}
                                  </span>
                                </div>
                              )}
                            </div>

                            {checkerResult.reason && !checkerResult.message && (
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Reason
                                </p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {checkerResult.reason}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blocked Attempts Tab */}
      {activeTab === 'attempts' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            {attemptStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Attempts</p>
                      <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{attemptStats.total}</p>
                    </div>
                    <ClipboardList className="w-8 h-8 text-indigo-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">Today</p>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-100">{attemptStats.today}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">This Week</p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{attemptStats.thisWeek}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">This Month</p>
                      <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{attemptStats.thisMonth}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Top Category and Severity */}
            {attemptStats && (attemptStats.topCategory || attemptStats.topSeverity) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attemptStats.topCategory && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Most Common Category</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {getCategories().find(c => c.value === attemptStats.topCategory)?.label || attemptStats.topCategory}
                    </p>
                  </div>
                )}
                {attemptStats.topSeverity && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Most Common Severity</p>
                    </div>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${severityConfig[attemptStats.topSeverity as 'low' | 'medium' | 'high']?.color || 'bg-gray-100 text-gray-800'}`}>
                      {severityConfig[attemptStats.topSeverity as 'low' | 'medium' | 'high']?.label || attemptStats.topSeverity}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by user email or username..."
                  value={filterAttemptUser}
                  onChange={(e) => {
                    setFilterAttemptUser(e.target.value);
                    setTimeout(() => loadAttempts(), 300);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <select
                value={filterAttemptType}
                onChange={(e) => {
                  setFilterAttemptType(e.target.value);
                  loadAttempts();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="post">Posts</option>
                <option value="comment">Comments</option>
                <option value="share_comment">Share Comments</option>
                <option value="message">Messages</option>
                <option value="other">Other</option>
              </select>
              <select
                value={filterAttemptCategory}
                onChange={(e) => {
                  setFilterAttemptCategory(e.target.value);
                  loadAttempts();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Categories</option>
                {getCategories().map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={filterAttemptSeverity}
                onChange={(e) => {
                  setFilterAttemptSeverity(e.target.value);
                  loadAttempts();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={loadAttempts}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Attempts Table */}
            {loadingAttempts ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No blocked attempts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Matched
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {attempt.user_username || attempt.user_email || attempt.user_id}
                              </div>
                              {attempt.user_email && attempt.user_username && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {attempt.user_email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {attempt.content_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attempt.matched_keyword && (
                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                              Keyword: {attempt.matched_keyword}
                            </div>
                          )}
                          {attempt.matched_domain && (
                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                              Domain: {attempt.matched_domain}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attempt.category && (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {getCategories().find(c => c.value === attempt.category)?.label || attempt.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attempt.severity && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConfig[attempt.severity].color}`}>
                              {severityConfig[attempt.severity].label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {attempt.warning_id && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 w-fit">
                                Warning Issued
                              </span>
                            )}
                            {attempt.warning_id && attempt.warning_acknowledged && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 w-fit">
                                Warning Acknowledged
                              </span>
                            )}
                            {attempt.is_suspended && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 w-fit">
                                User Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            {new Date(attempt.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedAttempt(attempt);
                                setShowAttemptModal(true);
                                setActionNotes('');
                              }}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {!attempt.warning_id && (
                              <button
                                onClick={() => {
                                  setSelectedAttempt(attempt);
                                  setShowWarnModal(true);
                                  setActionNotes('');
                                }}
                                className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                                title="Warn user"
                              >
                                <AlertTriangle className="w-5 h-5" />
                              </button>
                            )}
                            {!attempt.is_suspended && (
                              <button
                                onClick={() => {
                                  setSelectedAttempt(attempt);
                                  setShowSuspendModal(true);
                                  setActionNotes('');
                                  setSuspensionDays(1);
                                }}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Suspend user"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attempt Action Modal */}
      {showAttemptModal && selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Blocked Content Attempt Details
                </h3>
                <button
                  onClick={() => {
                    setShowAttemptModal(false);
                    setSelectedAttempt(null);
                    setActionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedAttempt.user_username || selectedAttempt.user_email || selectedAttempt.user_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attempted Content
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    {selectedAttempt.attempted_content}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message Shown to User
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    {selectedAttempt.message_shown || "No message recorded"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedAttempt.category ? (getCategories().find(c => c.value === selectedAttempt.category)?.label || selectedAttempt.category) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Severity
                    </label>
                    {selectedAttempt.severity && (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${severityConfig[selectedAttempt.severity].color}`}>
                        {severityConfig[selectedAttempt.severity].label}
                      </span>
                    )}
                  </div>
                </div>
                {selectedAttempt.matched_keyword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Matched Keyword
                    </label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      {selectedAttempt.matched_keyword}
                    </p>
                  </div>
                )}
                {selectedAttempt.matched_domain && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Matched Domain
                    </label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      {selectedAttempt.matched_domain}
                    </p>
                  </div>
                )}
                {(selectedAttempt.content_type === 'comment' || selectedAttempt.content_type === 'share_comment') && selectedAttempt.context_url && (() => {
                  // Parse context_url to extract post ID
                  // Format can be: /post/{postId} or /feed?post={postId} or /profile/{userId}?post={postId}
                  let postLink = selectedAttempt.context_url;
                  
                  // If it's in the format /post/{postId}, convert to /feed?post={postId}
                  const postIdMatch = postLink.match(/\/post\/([^/?]+)/);
                  if (postIdMatch) {
                    postLink = `/feed?post=${postIdMatch[1]}`;
                  } else if (postLink.startsWith('/feed') || postLink.startsWith('/profile')) {
                    // Already in correct format
                    postLink = postLink;
                  } else {
                    // Try to extract post ID from any URL format
                    const anyPostIdMatch = postLink.match(/post[=:]?([^&/?]+)/i);
                    if (anyPostIdMatch) {
                      postLink = `/feed?post=${anyPostIdMatch[1]}`;
                    }
                  }
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Related Post
                      </label>
                      <Link
                        href={postLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Post
                      </Link>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex flex-col gap-3">
                  {!selectedAttempt.warning_id && (
                    <button
                      onClick={() => {
                        setShowAttemptModal(false);
                        setShowWarnModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Warn User
                    </button>
                  )}
                  {!selectedAttempt.is_suspended && (
                    <button
                      onClick={() => {
                        setShowAttemptModal(false);
                        setShowSuspendModal(true);
                        setSuspensionDays(1);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4" />
                      Suspend User
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warn User Modal */}
      {showWarnModal && selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Warn User
                </h3>
                <button
                  onClick={() => {
                    setShowWarnModal(false);
                    setSelectedAttempt(null);
                    setActionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedAttempt.user_username || selectedAttempt.user_email || selectedAttempt.user_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attempted Content
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    {selectedAttempt.attempted_content}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Warning Message *
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white mb-4"
                  rows={4}
                  placeholder="Enter the warning message that will be shown to the user..."
                  required
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWarnModal(false);
                      setActionNotes('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWarnUser()}
                    disabled={actionLoading || !actionNotes.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Issuing...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Issue Warning
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Suspend User
                </h3>
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSelectedAttempt(null);
                    setActionNotes('');
                    setSuspensionDays(1);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedAttempt.user_username || selectedAttempt.user_email || selectedAttempt.user_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attempted Content
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    {selectedAttempt.attempted_content}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Suspension Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter number of days"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter 0 or leave empty for permanent suspension
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Suspension Reason *
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white mb-4"
                  rows={4}
                  placeholder="Enter the reason for suspension..."
                  required
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSuspendModal(false);
                      setActionNotes('');
                      setSuspensionDays(1);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSuspendUser()}
                    disabled={actionLoading || !actionNotes.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Suspending...
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        Suspend User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Modal */}
      {showKeywordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingKeyword ? 'Edit Keyword' : 'Add Keyword'}
                </h3>
                <button
                  onClick={() => {
                    setShowKeywordModal(false);
                    resetKeywordForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleKeywordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Keyword *
                  </label>
                  <input
                    type="text"
                    required
                    value={keywordFormData.keyword}
                    onChange={(e) => setKeywordFormData({ ...keywordFormData, keyword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter keyword or pattern"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={keywordFormData.category}
                      onChange={(e) => setKeywordFormData({ ...keywordFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {getCategories().map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Match Type *
                    </label>
                    <select
                      required
                      value={keywordFormData.match_type}
                      onChange={(e) => setKeywordFormData({ ...keywordFormData, match_type: e.target.value as 'exact' | 'contains' | 'regex' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="exact">Exact Match</option>
                      <option value="contains">Contains</option>
                      <option value="regex">Regex Pattern</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Severity *
                    </label>
                    <select
                      required
                      value={keywordFormData.severity}
                      onChange={(e) => setKeywordFormData({ ...keywordFormData, severity: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={keywordFormData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setKeywordFormData({ ...keywordFormData, is_active: e.target.value === 'active' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={keywordFormData.custom_message}
                    onChange={(e) => setKeywordFormData({ ...keywordFormData, custom_message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Custom warning message (leave empty for default message)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If provided, this message will be shown to users instead of the default message for this category.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeywordModal(false);
                      resetKeywordForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingKeyword ? 'Update' : 'Add'} Keyword
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Domain Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingDomain ? 'Edit Domain' : 'Add Domain'}
                </h3>
                <button
                  onClick={() => {
                    setShowDomainModal(false);
                    resetDomainForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleDomainSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domain *
                  </label>
                  <input
                    type="text"
                    required
                    value={domainFormData.domain}
                    onChange={(e) => setDomainFormData({ ...domainFormData, domain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="example.com (without http:// or www.)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={domainFormData.category}
                      onChange={(e) => setDomainFormData({ ...domainFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {getCategories().map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Severity *
                    </label>
                    <select
                      required
                      value={domainFormData.severity}
                      onChange={(e) => setDomainFormData({ ...domainFormData, severity: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={domainFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setDomainFormData({ ...domainFormData, is_active: e.target.value === 'active' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={domainFormData.custom_message}
                    onChange={(e) => setDomainFormData({ ...domainFormData, custom_message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Custom warning message (leave empty for default message)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If provided, this message will be shown to users instead of the default message for this category.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDomainModal(false);
                      resetDomainForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingDomain ? 'Update' : 'Add'} Domain
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    resetCategoryForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name * {editingCategory && <span className="text-xs text-gray-500">(cannot be changed)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCategory}
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    placeholder="e.g., violence, hate_speech, adult_content"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Lowercase letters, numbers, and underscores only. Must start with a letter. This category can be used for both keywords and domains.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.display_name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, display_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Violence, Hate Speech"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This is the name shown to admins in dropdowns and tables.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Message *
                  </label>
                  <textarea
                    required
                    value={categoryFormData.default_message}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, default_message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    rows={4}
                    placeholder="This message will be shown to users when content matches this category..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This is the default message shown to users. Individual keywords/domains can override this with custom messages.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={categoryFormData.display_order}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Lower numbers appear first. Categories are sorted alphabetically by default.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryFormData.is_active}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Active
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                      Inactive categories won't appear in dropdowns.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      resetCategoryForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingCategory ? 'Update' : 'Add'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

