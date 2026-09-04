"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  X,
  Plus,
  Edit,
  Eye,
  UserPlus,
  Settings,
  Tag,
  Flag,
  Trash2,
  Save,
  FileText,
  Download,
  CheckCircle2,
  MoreVertical,
  Crown,
  Sparkles,
  Zap,
  Star
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

const statusConfig = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  waiting_user: {
    label: 'Waiting for User',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  customer_reply: {
    label: 'Customer Reply',
    icon: MessageSquare,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  closed: {
    label: 'Closed',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface AdminSupportTicketsProps {
  supabase: ReturnType<typeof createClient>;
  currentUserId: string;
}

export function AdminSupportTickets({ supabase, currentUserId }: AdminSupportTicketsProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'categories' | 'priorities'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [updatingSubject, setUpdatingSubject] = useState(false);
  const [editingTicketCategory, setEditingTicketCategory] = useState(false);
  const [editedCategoryId, setEditedCategoryId] = useState('');
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Category/Priority Management
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingPriority, setEditingPriority] = useState<any | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', display_name: '', description: '', display_order: 0, custom_fields: null as any });
  const [priorityForm, setPriorityForm] = useState({ name: '', display_name: '', color: 'blue', display_order: 0 });

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [dateRange, setDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Create Ticket on Behalf of User
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [createTicketForm, setCreateTicketForm] = useState({
    user_id: '',
    category_id: '',
    priority_id: '',
    subject: '',
    description: '',
    custom_data: {} as Record<string, any>,
    assigned_to: ''
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [selectedCategoryForCreate, setSelectedCategoryForCreate] = useState<any | null>(null);

  // Bulk Actions
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssignTo, setBulkAssignTo] = useState('');
  const [applyingBulkAction, setApplyingBulkAction] = useState(false);

  useEffect(() => {
    loadAdminPreferences();
    loadCategories();
    loadPriorities();
    loadAdmins();
  }, [currentUserId]);

  useEffect(() => {
    if (preferencesLoaded) {
      loadTickets();
      loadStats();
    }
  }, [filterStatus, filterCategory, filterPriority, filterAssigned, sortBy, dateRange, preferencesLoaded]);

  // Ensure selectedCategoryForCreate is set when category changes in create modal
  useEffect(() => {
    if (showCreateTicketModal && createTicketForm.category_id && categories.length > 0) {
      const category = categories.find(c => c.id === createTicketForm.category_id);
      if (category && (!selectedCategoryForCreate || selectedCategoryForCreate.id !== category.id)) {
        setSelectedCategoryForCreate(category);
      }
    }
  }, [showCreateTicketModal, createTicketForm.category_id, categories]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_support_ticket_stats');
      if (error) {
        console.error("Error loading stats:", error);
        alert("Failed to load stats: " + error.message);
        return;
      }
      console.log("Stats data:", data);
      // The function returns a TABLE, so data is an array
      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data[0]);
      } else {
        console.warn("No stats data returned or empty array");
        setStats(null);
      }
    } catch (error: any) {
      console.error("Error loading stats:", error);
      alert("Failed to load stats: " + (error?.message || 'Unknown error'));
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadPriorities = async () => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_priorities')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setPriorities(data || []);
    } catch (error) {
      console.error("Error loading priorities:", error);
    }
  };

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('clerk_id, display_name, email')
        .eq('is_admin', true)
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('clerk_id, display_name, email, avatar_url')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setUserSearchResults([]);
    }
  };

  const handleCreateTicket = async () => {
    if (!createTicketForm.user_id || !createTicketForm.category_id || !createTicketForm.priority_id || !createTicketForm.subject.trim() || !createTicketForm.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setCreatingTicket(true);
    try {
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: createTicketForm.user_id,
          category_id: createTicketForm.category_id,
          priority_id: createTicketForm.priority_id,
          subject: createTicketForm.subject.trim(),
          description: createTicketForm.description.trim(),
          custom_data: Object.keys(createTicketForm.custom_data).length > 0 ? createTicketForm.custom_data : null,
          assigned_to: createTicketForm.assigned_to || null,
          created_by_admin: currentUserId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create ticket');

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: createTicketForm.user_id,
        type: 'ticket_created',
        actor_id: currentUserId,
        target_id: data.ticket.id,
        message: `A support ticket has been created on your behalf: ${createTicketForm.subject.trim()}`,
      });

      // Reset form
      setCreateTicketForm({
        user_id: '',
        category_id: '',
        priority_id: '',
        subject: '',
        description: '',
        custom_data: {},
        assigned_to: ''
      });
      setSelectedUser(null);
      setSelectedCategoryForCreate(null);
      setUserSearchQuery('');
      setShowCreateTicketModal(false);

      await loadTickets();
      await loadStats();
      alert("Ticket created successfully!");
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket: " + error.message);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedTickets.size === 0) {
      alert("Please select at least one ticket");
      return;
    }

    if (!bulkStatus && !bulkAssignTo) {
      alert("Please select an action (status or assignment)");
      return;
    }

    setApplyingBulkAction(true);
    try {
      const updates: any = {};
      if (bulkStatus) updates.status = bulkStatus;
      if (bulkAssignTo) updates.assigned_to = bulkAssignTo === 'unassigned' ? null : bulkAssignTo;

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .in('id', Array.from(selectedTickets));

      if (error) throw error;

      // Create notifications
      const ticketIds = Array.from(selectedTickets);
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, user_id, ticket_number')
        .in('id', ticketIds);

      if (tickets) {
        const notifications = tickets.map(ticket => ({
          user_id: ticket.user_id,
          type: bulkStatus ? 'ticket_status_changed' : 'ticket_assigned',
          actor_id: currentUserId,
          target_id: ticket.id,
          message: bulkStatus 
            ? `Your ticket ${ticket.ticket_number} status has been updated to ${statusConfig[bulkStatus as keyof typeof statusConfig]?.label || bulkStatus}`
            : `Your ticket ${ticket.ticket_number} has been assigned to an admin`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setSelectedTickets(new Set());
      setBulkStatus('');
      setBulkAssignTo('');
      setShowBulkActions(false);

      await loadTickets();
      await loadStats();
      alert(`Successfully updated ${ticketIds.length} ticket(s)!`);
    } catch (error: any) {
      console.error("Error applying bulk action:", error);
      alert("Failed to apply bulk action: " + error.message);
    } finally {
      setApplyingBulkAction(false);
    }
  };

  const exportTickets = () => {
    const csv = [
      ['Ticket Number', 'Subject', 'User', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', 'Updated'].join(','),
      ...filteredTickets.map(ticket => [
        ticket.ticket_number,
        `"${ticket.subject.replace(/"/g, '""')}"`,
        `"${(ticket.user_display_name || ticket.user_email || '').replace(/"/g, '""')}"`,
        ticket.category_display_name,
        ticket.priority_display_name,
        ticket.status,
        ticket.assigned_to_name || 'Unassigned',
        new Date(ticket.created_at).toLocaleString(),
        ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const loadAdminPreferences = async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('clerk_id', currentUserId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.settings?.adminSupportTickets) {
        const prefs = data.settings.adminSupportTickets;
        if (prefs.filterStatus) setFilterStatus(prefs.filterStatus);
        if (prefs.filterCategory) setFilterCategory(prefs.filterCategory);
        if (prefs.filterPriority) setFilterPriority(prefs.filterPriority);
        if (prefs.filterAssigned) setFilterAssigned(prefs.filterAssigned);
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.dateRange) setDateRange(prefs.dateRange);
      }
      setPreferencesLoaded(true);
    } catch (error) {
      console.error("Error loading admin preferences:", error);
      setPreferencesLoaded(true);
    }
  };

  const saveAdminPreferences = async () => {
    if (!currentUserId) return;
    
    try {
      const { data: currentData } = await supabase
        .from('profiles')
        .select('settings')
        .eq('clerk_id', currentUserId)
        .single();
      
      const currentSettings = currentData?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        adminSupportTickets: {
          filterStatus,
          filterCategory,
          filterPriority,
          filterAssigned,
          sortBy,
          dateRange,
        },
      };
      
      await supabase
        .from('profiles')
        .update({ settings: updatedSettings })
        .eq('clerk_id', currentUserId);
    } catch (error) {
      console.error("Error saving admin preferences:", error);
    }
  };

  const loadTickets = async () => {
    if (!preferencesLoaded) return;
    
    setLoading(true);
    try {
      const status = filterStatus !== 'all' ? filterStatus : null;
      const categoryId = filterCategory !== 'all' ? filterCategory : null;
      const priorityId = filterPriority !== 'all' ? filterPriority : null;
      const assignedTo = filterAssigned !== 'all' ? filterAssigned : null;

      const { data, error } = await supabase.rpc('get_admin_tickets', {
        p_status: status,
        p_category_id: categoryId,
        p_priority_id: priorityId,
        p_assigned_to: assignedTo,
        p_user_id: null,
        p_limit: 200,
        p_offset: 0,
      });
      
      if (error) throw error;
      
      let filteredTickets = data || [];
      
      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            filteredTickets = filteredTickets.filter((t: any) => new Date(t.created_at) >= filterDate);
            break;
          case 'week':
            filterDate.setDate(filterDate.getDate() - 7);
            filteredTickets = filteredTickets.filter((t: any) => new Date(t.created_at) >= filterDate);
            break;
          case 'month':
            filterDate.setMonth(filterDate.getMonth() - 1);
            filteredTickets = filteredTickets.filter((t: any) => new Date(t.created_at) >= filterDate);
            break;
          case 'year':
            filterDate.setFullYear(filterDate.getFullYear() - 1);
            filteredTickets = filteredTickets.filter((t: any) => new Date(t.created_at) >= filterDate);
            break;
        }
      }
      
      // Apply sorting
      filteredTickets.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'created_desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'created_asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'updated_desc':
            return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
          case 'updated_asc':
            return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
          case 'status':
            return a.status.localeCompare(b.status);
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            return (priorityOrder[b.priority_name as keyof typeof priorityOrder] || 0) - 
                   (priorityOrder[a.priority_name as keyof typeof priorityOrder] || 0);
          case 'subject':
            return a.subject.localeCompare(b.subject);
          case 'user':
            return (a.user_display_name || a.user_email || '').localeCompare(b.user_display_name || b.user_email || '');
          default:
            return 0;
        }
      });
      
      setTickets(filteredTickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
      alert("Failed to load tickets: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Save preferences when filters change
  useEffect(() => {
    if (preferencesLoaded && currentUserId) {
      const timeoutId = setTimeout(() => {
        saveAdminPreferences();
      }, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [filterStatus, filterCategory, filterPriority, filterAssigned, sortBy, dateRange, preferencesLoaded]);

  const loadTicketDetails = async (ticketId: string) => {
    try {
      // Load ticket with all details
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories(*),
          priority:support_ticket_priorities(*),
          user:profiles!support_tickets_user_id_fkey(display_name, email, avatar_url, subscription_plan, is_premium),
          assigned_to_profile:profiles!support_tickets_assigned_to_fkey(display_name, email)
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      setSelectedTicket(ticketData);

      // Load all replies (including internal notes for admins)
      const { data: repliesData, error: repliesError } = await supabase
        .from('support_ticket_replies')
        .select(`
          *,
          user:profiles(display_name, email, avatar_url, is_admin)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error("Error loading ticket details:", error);
      alert("Failed to load ticket details: " + (error as Error).message);
    }
  };

  const handleAssignTicket = async (adminId: string | null) => {
    if (!selectedTicket) return;

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: adminId })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Create notification for assigned admin
      if (adminId) {
        await supabase.from('notifications').insert({
          user_id: adminId,
          type: 'ticket_assigned',
          actor_id: currentUserId,
          target_id: selectedTicket.id,
          message: `Ticket ${selectedTicket.ticket_number} has been assigned to you`,
        });
      }

      // Notify ticket creator
      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'ticket_assigned',
        actor_id: currentUserId,
        target_id: selectedTicket.id,
        message: `Your ticket ${selectedTicket.ticket_number} has been assigned to an admin`,
      });

      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
      await loadStats();
      alert("Ticket assigned successfully!");
    } catch (error: any) {
      console.error("Error assigning ticket:", error);
      alert("Failed to assign ticket: " + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'ticket_status_changed',
        actor_id: currentUserId,
        target_id: selectedTicket.id,
        message: `Your ticket ${selectedTicket.ticket_number} status has been updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`,
      });

      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
      await loadStats();
      alert("Ticket status updated successfully!");
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReply = async (isInternal: boolean = false) => {
    if (!selectedTicket || (!newReply.trim() && !internalNote.trim())) return;

    const message = isInternal ? internalNote.trim() : newReply.trim();
    if (!message) return;

    setReplying(true);
    try {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: currentUserId,
          message: message,
          is_internal: isInternal,
          is_admin_reply: true,
        });

      if (error) throw error;

      // Status is automatically updated by trigger when user replies
      // No need to manually update status here

      if (!isInternal) {
        // Notify user
        await supabase.from('notifications').insert({
          user_id: selectedTicket.user_id,
          type: 'ticket_replied',
          actor_id: currentUserId,
          target_id: selectedTicket.id,
          message: `Admin replied to your ticket ${selectedTicket.ticket_number}`,
        });
      }

      setNewReply('');
      setInternalNote('');
      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
      await loadStats();
    } catch (error: any) {
      console.error("Error replying to ticket:", error);
      alert("Failed to send reply: " + error.message);
    } finally {
      setReplying(false);
    }
  };

  const handleUpdateSubject = async () => {
    if (!selectedTicket || !editedSubject.trim() || updatingSubject) return;

    setUpdatingSubject(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ subject: editedSubject.trim() })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
      setEditingSubject(false);
      alert("Ticket subject updated successfully!");
    } catch (error: any) {
      console.error("Error updating subject:", error);
      alert("Failed to update subject: " + error.message);
    } finally {
      setUpdatingSubject(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedTicket || !editedCategoryId || updatingCategory) return;

    setUpdatingCategory(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ category_id: editedCategoryId })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
      await loadStats();
      setEditingTicketCategory(false);
      alert("Ticket category updated successfully!");
    } catch (error: any) {
      console.error("Error updating category:", error);
      alert("Failed to update category: " + error.message);
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('support_ticket_categories')
          .update({
            display_name: categoryForm.display_name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            custom_fields: categoryForm.custom_fields,
          })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('support_ticket_categories')
          .insert({
            name: categoryForm.name.toLowerCase().replace(/\s+/g, '_'),
            display_name: categoryForm.display_name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            custom_fields: categoryForm.custom_fields,
          });
        if (error) throw error;
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', display_name: '', description: '', display_order: 0, custom_fields: null });
      await loadCategories();
      alert('Category saved successfully!');
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert('Failed to save category: ' + error.message);
    }
  };

  const handleSavePriority = async () => {
    try {
      if (editingPriority) {
        const { error } = await supabase
          .from('support_ticket_priorities')
          .update({
            display_name: priorityForm.display_name,
            color: priorityForm.color,
            display_order: priorityForm.display_order,
          })
          .eq('id', editingPriority.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('support_ticket_priorities')
          .insert({
            name: priorityForm.name.toLowerCase().replace(/\s+/g, '_'),
            display_name: priorityForm.display_name,
            color: priorityForm.color,
            display_order: priorityForm.display_order,
          });
        if (error) throw error;
      }
      setShowPriorityModal(false);
      setEditingPriority(null);
      setPriorityForm({ name: '', display_name: '', color: 'blue', display_order: 0 });
      await loadPriorities();
      alert('Priority saved successfully!');
    } catch (error: any) {
      console.error('Error saving priority:', error);
      alert('Failed to save priority: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will affect existing tickets.')) return;
    try {
      const { error } = await supabase
        .from('support_ticket_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      await loadCategories();
      alert('Category deactivated successfully!');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category: ' + error.message);
    }
  };

  const handleDeletePriority = async (id: string) => {
    if (!confirm('Are you sure you want to delete this priority? This will affect existing tickets.')) return;
    try {
      const { error } = await supabase
        .from('support_ticket_priorities')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      await loadPriorities();
      alert('Priority deactivated successfully!');
    } catch (error: any) {
      console.error('Error deleting priority:', error);
      alert('Failed to delete priority: ' + error.message);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.user_display_name?.toLowerCase().includes(query) ||
        ticket.user_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Support Tickets
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user support tickets, bug reports, and feature requests
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tickets'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Tickets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </div>
          </button>
          <button
            onClick={() => setActiveTab('priorities')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'priorities'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Priorities
            </div>
          </button>
        </nav>
      </div>

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <>
          {/* Stats Dashboard */}
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.total_tickets || 0}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {stats.outstanding_tickets || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Waiting on admin
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.tickets_created_today || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.tickets_created_this_week || 0} this week
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Tickets</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.open_tickets || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.customer_reply_tickets || 0} customer replies
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
          </div>
        )}

        {/* Actions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateTicketModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Ticket
              </button>
              <button
                onClick={exportTickets}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                disabled={filteredTickets.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {selectedTickets.size > 0 && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                  Bulk Actions ({selectedTickets.size})
                </button>
              )}
            </div>
            {selectedTickets.size > 0 && (
              <button
                onClick={() => setSelectedTickets(new Set())}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && selectedTickets.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Status
                  </label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No Change</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting for User</option>
                    <option value="customer_reply">Customer Reply</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign To
                  </label>
                  <select
                    value={bulkAssignTo}
                    onChange={(e) => setBulkAssignTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No Change</option>
                    <option value="unassigned">Unassigned</option>
                    <option value={currentUserId}>Assign to Me</option>
                    {admins.map(admin => (
                      <option key={admin.clerk_id} value={admin.clerk_id}>
                        {admin.display_name || admin.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleBulkAction}
                    disabled={applyingBulkAction || (!bulkStatus && !bulkAssignTo)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingBulkAction ? 'Applying...' : 'Apply to Selected'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{stats.open_tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{stats.in_progress_tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer Reply</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">{stats.customer_reply_tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Waiting User</p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">{stats.waiting_user_tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.resolved_tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Closed</p>
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">{stats.closed_tickets || 0}</p>
              </div>
            </div>
          </div>
        )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets by number, subject, user name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_user">Waiting for User</option>
                  <option value="customer_reply">Customer Reply</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Priorities</option>
                  {priorities.map(pri => (
                    <option key={pri.id} value={pri.id}>{pri.display_name}</option>
                  ))}
                </select>
                <select
                  value={filterAssigned}
                  onChange={(e) => setFilterAssigned(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Assignments</option>
                  <option value="unassigned">Unassigned</option>
                  <option value={currentUserId}>Assigned to Me</option>
                  {admins.map(admin => (
                    <option key={admin.clerk_id} value={admin.clerk_id}>
                      {admin.display_name || admin.email}
                    </option>
                  ))}
                </select>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="created_desc">Newest First</option>
                  <option value="created_asc">Oldest First</option>
                  <option value="updated_desc">Recently Updated</option>
                  <option value="updated_asc">Least Recently Updated</option>
                  <option value="status">By Status</option>
                  <option value="priority">By Priority</option>
                  <option value="subject">By Subject (A-Z)</option>
                  <option value="user">By User (A-Z)</option>
                </select>
              </div>
              
              {/* Active Filters Display */}
              {(filterStatus !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || filterAssigned !== 'all' || dateRange !== 'all') && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
                  {filterStatus !== 'all' && (
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      Status: {statusConfig[filterStatus as keyof typeof statusConfig]?.label || filterStatus}
                      <button onClick={() => setFilterStatus('all')} className="ml-1 hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {filterCategory !== 'all' && (
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      Category: {categories.find(c => c.id === filterCategory)?.display_name || filterCategory}
                      <button onClick={() => setFilterCategory('all')} className="ml-1 hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {filterPriority !== 'all' && (
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      Priority: {priorities.find(p => p.id === filterPriority)?.display_name || filterPriority}
                      <button onClick={() => setFilterPriority('all')} className="ml-1 hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {filterAssigned !== 'all' && (
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      {filterAssigned === 'unassigned' ? 'Unassigned' : filterAssigned === currentUserId ? 'Assigned to Me' : `Assigned: ${admins.find(a => a.clerk_id === filterAssigned)?.display_name || filterAssigned}`}
                      <button onClick={() => setFilterAssigned('all')} className="ml-1 hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {dateRange !== 'all' && (
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 Days' : dateRange === 'month' ? 'Last 30 Days' : 'Last Year'}
                      <button onClick={() => setDateRange('all')} className="ml-1 hover:text-indigo-900">×</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterCategory('all');
                      setFilterPriority('all');
                      setFilterAssigned('all');
                      setDateRange('all');
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTickets(new Set(filteredTickets.map(t => t.id)));
                        } else {
                          setSelectedTickets(new Set());
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTickets.map((ticket) => {
                  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTickets.has(ticket.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedTickets);
                            if (e.target.checked) {
                              newSelected.add(ticket.id);
                            } else {
                              newSelected.delete(ticket.id);
                            }
                            setSelectedTickets(newSelected);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {ticket.ticket_number}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={ticket.subject}>
                            {ticket.subject}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {ticket.user_display_name || ticket.user_email || ticket.user_id}
                            </div>
                            {ticket.user_email && ticket.user_display_name && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {ticket.user_email}
                              </div>
                            )}
                          </div>
                          {ticket.user_subscription_plan && ticket.user_subscription_plan !== 'free' && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {ticket.user_subscription_plan === 'ultimate' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                  <Crown className="w-3 h-3" />
                                  Ultimate
                                </span>
                              ) : ticket.user_subscription_plan === 'pro' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                  <Sparkles className="w-3 h-3" />
                                  Pro
                                </span>
                              ) : null}
                              {(ticket.user_subscription_plan === 'pro' || ticket.user_subscription_plan === 'ultimate') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                                  <Star className="w-3 h-3" />
                                  Priority
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {ticket.category_display_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[ticket.priority_name] || 'bg-gray-100 text-gray-700'}`}>
                          {ticket.priority_display_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {ticket.assigned_to_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <RelativeTime date={ticket.created_at} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowTicketModal(true);
                            loadTicketDetails(ticket.id);
                          }}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="View ticket"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Categories</h3>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', display_name: '', description: '', display_order: categories.length, custom_fields: null });
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{cat.display_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{cat.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{cat.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cat.display_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        cat.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name,
                            display_name: cat.display_name,
                            description: cat.description || '',
                            display_order: cat.display_order,
                            custom_fields: cat.custom_fields,
                          });
                          setShowCategoryModal(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Priorities Tab */}
      {activeTab === 'priorities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Priorities</h3>
            <button
              onClick={() => {
                setEditingPriority(null);
                setPriorityForm({ name: '', display_name: '', color: 'blue', display_order: priorities.length });
                setShowPriorityModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Priority
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Color</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {priorities.map((pri) => (
                  <tr key={pri.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{pri.display_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{pri.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[pri.name] || 'bg-gray-100 text-gray-700'}`}>
                        {pri.display_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {pri.display_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        pri.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {pri.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPriority(pri);
                          setPriorityForm({
                            name: pri.name,
                            display_name: pri.display_name,
                            color: pri.color || 'blue',
                            display_order: pri.display_order,
                          });
                          setShowPriorityModal(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDeletePriority(pri.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {selectedTicket.ticket_number}
                      </span>
                      {editingSubject ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            className="flex-1 px-3 py-2 text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Ticket subject"
                            autoFocus
                          />
                          <button
                            onClick={handleUpdateSubject}
                            disabled={updatingSubject || !editedSubject.trim()}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            {updatingSubject ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSubject(false);
                              setEditedSubject(selectedTicket.subject);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedTicket.subject}
                          </h2>
                          <button
                            onClick={() => {
                              setEditingSubject(true);
                              setEditedSubject(selectedTicket.subject);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                            title="Edit subject"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(() => {
                        const statusInfo = statusConfig[selectedTicket.status as keyof typeof statusConfig];
                        const StatusIcon = statusInfo.icon;
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                      {editingTicketCategory ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editedCategoryId}
                            onChange={(e) => setEditedCategoryId(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleUpdateCategory}
                            disabled={updatingCategory || !editedCategoryId}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            {updatingCategory ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTicketCategory(false);
                              setEditedCategoryId(selectedTicket.category_id || selectedTicket.category?.id || '');
                            }}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {selectedTicket.category?.display_name || selectedTicket.category_display_name}
                          </span>
                          <button
                            onClick={() => {
                              setEditingTicketCategory(true);
                              setEditedCategoryId(selectedTicket.category_id || selectedTicket.category?.id || '');
                            }}
                            className="p-0.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                            title="Edit category"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[selectedTicket.priority?.name || selectedTicket.priority_name] || 'bg-gray-100 text-gray-700'}`}>
                        {selectedTicket.priority?.display_name || selectedTicket.priority_display_name}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTicketModal(false);
                      setSelectedTicket(null);
                      setReplies([]);
                      setEditingSubject(false);
                      setEditingTicketCategory(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Ticket Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Created By
                  </label>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedTicket.user?.display_name || selectedTicket.user_display_name || selectedTicket.user?.email || selectedTicket.user_email || 'Unknown'}
                    </p>
                    {(selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) && (selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) !== 'free' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {(selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) === 'ultimate' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            <Crown className="w-3 h-3" />
                            Ultimate Plan
                          </span>
                        ) : (selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) === 'pro' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <Sparkles className="w-3 h-3" />
                            Pro Plan
                          </span>
                        ) : null}
                        {((selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) === 'pro' || (selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) === 'ultimate') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                            <Star className="w-3 h-3" />
                            Priority Support
                          </span>
                        )}
                      </div>
                    )}
                    {(!selectedTicket.user?.subscription_plan && !selectedTicket.user_subscription_plan) || (selectedTicket.user?.subscription_plan || selectedTicket.user_subscription_plan) === 'free' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Zap className="w-3 h-3" />
                        Free Plan
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Assigned To
                  </label>
                  <select
                    value={selectedTicket.assigned_to || ''}
                    onChange={(e) => handleAssignTicket(e.target.value || null)}
                    disabled={assigning}
                    className="w-full px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {admins.map(admin => (
                      <option key={admin.clerk_id} value={admin.clerk_id}>
                        {admin.display_name || admin.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="w-full px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting for User</option>
                    <option value="customer_reply">Customer Reply</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Created
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <RelativeTime date={selectedTicket.created_at} />
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Last Responded
                  </label>
                  <div className="text-sm">
                    {selectedTicket.last_responded_by ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          selectedTicket.last_responded_by === 'staff' 
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {selectedTicket.last_responded_by === 'staff' ? 'Staff' : 'User'}
                        </span>
                        {selectedTicket.last_responded_at && (
                          <span className="text-gray-600 dark:text-gray-400">
                            <RelativeTime date={selectedTicket.last_responded_at} />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No responses yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Description</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Custom Data */}
              {selectedTicket.custom_data && typeof selectedTicket.custom_data === 'object' && Object.keys(selectedTicket.custom_data).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Additional Information</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="space-y-3">
                      {Object.entries(selectedTicket.custom_data).map(([key, value]) => {
                        // Try to get the field label from the category's custom_fields
                        const category = categories.find(c => c.id === selectedTicket.category_id || c.id === selectedTicket.category?.id);
                        const fieldDef = category?.custom_fields?.find((f: any) => f.name === key);
                        const label = fieldDef?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        return (
                          <div key={key} className="border-b border-blue-200 dark:border-blue-800 last:border-0 pb-3 last:pb-0">
                            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wide">
                              {label}
                            </label>
                            <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                              {String(value || '—')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Replies & Updates ({replies.length})
                </h3>
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        reply.is_internal
                          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-400'
                          : reply.is_admin_reply
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {reply.user?.display_name || reply.user?.email || 'Unknown User'}
                          </span>
                          {reply.is_admin_reply && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              Admin
                            </span>
                          )}
                          {reply.is_internal && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                              Internal Note
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          <RelativeTime date={reply.created_at} />
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Forms */}
              <div className="space-y-4">
                {/* Public Reply */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reply to User
                  </label>
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white mb-2"
                    placeholder="Type your reply to the user..."
                  />
                  <button
                    onClick={() => handleReply(false)}
                    disabled={!newReply.trim() || replying}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>

                {/* Internal Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Internal Note (Visible only to admins)
                  </label>
                  <textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white mb-2"
                    placeholder="Add an internal note for other admins..."
                  />
                  <button
                    onClick={() => handleReply(true)}
                    disabled={!internalNote.trim() || replying}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {replying ? 'Adding...' : 'Add Internal Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Ticket on Behalf of User
                </h2>
                <button
                  onClick={() => {
                    setShowCreateTicketModal(false);
                    setCreateTicketForm({
                      user_id: '',
                      category_id: '',
                      priority_id: '',
                      subject: '',
                      description: '',
                      custom_data: {},
                      assigned_to: ''
                    });
                    setSelectedUser(null);
                    setSelectedCategoryForCreate(null);
                    setUserSearchQuery('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {selectedUser.display_name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedUser.email}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setCreateTicketForm(prev => ({ ...prev, user_id: '' }));
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        placeholder="Search by name or email..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      {userSearchResults.length > 0 && (
                        <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <button
                              key={user.clerk_id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setCreateTicketForm(prev => ({ ...prev, user_id: user.clerk_id }));
                                setUserSearchQuery('');
                                setUserSearchResults([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.display_name || 'No name'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createTicketForm.category_id}
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      const category = categories.find(c => c.id === categoryId);
                      setSelectedCategoryForCreate(category || null);
                      setCreateTicketForm(prev => ({ ...prev, category_id: categoryId, custom_data: {} }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Fields */}
                {selectedCategoryForCreate && selectedCategoryForCreate.custom_fields && (() => {
                  try {
                    const customFields = typeof selectedCategoryForCreate.custom_fields === 'string' 
                      ? JSON.parse(selectedCategoryForCreate.custom_fields) 
                      : selectedCategoryForCreate.custom_fields;
                    
                    if (Array.isArray(customFields) && customFields.length > 0) {
                      return (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Additional Information
                          </label>
                          {customFields.map((field: any, index: number) => (
                            <div key={index}>
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {field.label || field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={createTicketForm.custom_data[field.name] || ''}
                                  onChange={(e) => {
                                    setCreateTicketForm(prev => ({
                                      ...prev,
                                      custom_data: {
                                        ...prev.custom_data,
                                        [field.name]: e.target.value
                                      }
                                    }));
                                  }}
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                  placeholder={field.placeholder || ''}
                                />
                              ) : (
                                <input
                                  type={field.type || 'text'}
                                  value={createTicketForm.custom_data[field.name] || ''}
                                  onChange={(e) => {
                                    setCreateTicketForm(prev => ({
                                      ...prev,
                                      custom_data: {
                                        ...prev.custom_data,
                                        [field.name]: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                  placeholder={field.placeholder || ''}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error("Error parsing custom_fields:", e);
                  }
                  return null;
                })()}

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createTicketForm.priority_id}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, priority_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a priority</option>
                    {priorities.map(pri => (
                      <option key={pri.id} value={pri.id}>{pri.display_name}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createTicketForm.subject}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter ticket subject..."
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={createTicketForm.description}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter ticket description..."
                  />
                </div>

                {/* Assign To (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign To (Optional)
                  </label>
                  <select
                    value={createTicketForm.assigned_to}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    <option value={currentUserId}>Assign to Me</option>
                    {admins.map(admin => (
                      <option key={admin.clerk_id} value={admin.clerk_id}>
                        {admin.display_name || admin.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowCreateTicketModal(false);
                      setCreateTicketForm({
                        user_id: '',
                        category_id: '',
                        priority_id: '',
                        subject: '',
                        description: '',
                        custom_data: {},
                        assigned_to: ''
                      });
                      setSelectedUser(null);
                      setSelectedCategoryForCreate(null);
                      setUserSearchQuery('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTicket}
                    disabled={creatingTicket || !createTicketForm.user_id || !createTicketForm.category_id || !createTicketForm.priority_id || !createTicketForm.subject.trim() || !createTicketForm.description.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingTicket ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

