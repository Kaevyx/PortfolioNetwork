"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, X } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";

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

export default function SupportPage() {
  const { user, isLoaded } = useUser();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [dateRange, setDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    category_id: '',
    priority_id: '',
    subject: '',
    description: '',
    custom_data: {} as Record<string, any>,
  });
  
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadUserPreferences();
      loadCategories();
      loadPriorities();
    }
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (isLoaded && user?.id && preferencesLoaded) {
      loadTickets();
    }
  }, [isLoaded, user?.id, filterStatus, filterCategory, filterPriority, sortBy, dateRange, preferencesLoaded]);

  // Ensure selectedCategory is set when modal opens or category changes
  useEffect(() => {
    if (showCreateModal && formData.category_id && categories.length > 0) {
      const category = categories.find(c => c.id === formData.category_id);
      if (category && (!selectedCategory || selectedCategory.id !== category.id)) {
        setSelectedCategory(category);
      }
    }
  }, [showCreateModal, formData.category_id, categories]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      // Log categories to debug custom_fields
      console.log('Loaded categories:', data);
      if (data) {
        data.forEach(cat => {
          console.log(`Category: ${cat.display_name}, custom_fields:`, cat.custom_fields, 'Type:', typeof cat.custom_fields);
        });
      }
      
      setCategories(data || []);
      if (data && data.length > 0) {
        if (!formData.category_id) {
          const firstCategory = data[0];
          setFormData(prev => ({ ...prev, category_id: firstCategory.id }));
          setSelectedCategory(firstCategory);
          console.log('Set initial category:', firstCategory);
        } else {
          // If category_id is already set, find and set the selected category
          const category = data.find(c => c.id === formData.category_id);
          if (category) {
            setSelectedCategory(category);
            console.log('Set existing category:', category);
          }
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadPriorities = async () => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_priorities')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setPriorities(data || []);
      if (data && data.length > 0 && !formData.priority_id) {
        // Default to 'normal' priority
        const normalPriority = data.find(p => p.name === 'normal') || data[0];
        setFormData(prev => ({ ...prev, priority_id: normalPriority.id }));
      }
    } catch (error) {
      console.error("Error loading priorities:", error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('clerk_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      if (data?.settings?.supportTickets) {
        const prefs = data.settings.supportTickets;
        if (prefs.filterStatus) setFilterStatus(prefs.filterStatus);
        if (prefs.filterCategory) setFilterCategory(prefs.filterCategory);
        if (prefs.filterPriority) setFilterPriority(prefs.filterPriority);
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.dateRange) setDateRange(prefs.dateRange);
      }
      setPreferencesLoaded(true);
    } catch (error) {
      console.error("Error loading preferences:", error);
      setPreferencesLoaded(true); // Continue even if preferences fail
    }
  };

  const saveUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const { data: currentData } = await supabase
        .from('profiles')
        .select('settings')
        .eq('clerk_id', user.id)
        .single();
      
      const currentSettings = currentData?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        supportTickets: {
          filterStatus,
          filterCategory,
          filterPriority,
          sortBy,
          dateRange,
        },
      };
      
      await supabase
        .from('profiles')
        .update({ settings: updatedSettings })
        .eq('clerk_id', user.id);
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const loadTickets = async () => {
    if (!user?.id || !preferencesLoaded) return;
    
    setLoading(true);
    try {
      const status = filterStatus !== 'all' ? filterStatus : null;
      const { data, error } = await supabase.rpc('get_user_tickets', {
        p_user_id: user.id,
        p_status: status,
        p_limit: 100,
        p_offset: 0,
      });
      
      if (error) throw error;
      
      let filteredTickets = data || [];
      
      // Apply additional filters
      if (filterCategory !== 'all') {
        filteredTickets = filteredTickets.filter(t => t.category_id === filterCategory);
      }
      
      if (filterPriority !== 'all') {
        filteredTickets = filteredTickets.filter(t => t.priority_id === filterPriority);
      }
      
      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= filterDate);
            break;
          case 'week':
            filterDate.setDate(filterDate.getDate() - 7);
            filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= filterDate);
            break;
          case 'month':
            filterDate.setMonth(filterDate.getMonth() - 1);
            filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= filterDate);
            break;
          case 'year':
            filterDate.setFullYear(filterDate.getFullYear() - 1);
            filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= filterDate);
            break;
        }
      }
      
      // Apply sorting
      filteredTickets.sort((a, b) => {
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || creating) return;

    if (!formData.category_id || !formData.priority_id || !formData.subject.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate custom fields
    if (selectedCategory?.custom_fields && Array.isArray(selectedCategory.custom_fields)) {
      for (const field of selectedCategory.custom_fields) {
        if (field.required && !formData.custom_data[field.name]?.trim()) {
          alert(`Please fill in the required field: ${field.label}`);
          return;
        }
      }
    }

    setCreating(true);
    try {
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: formData.category_id,
          priority_id: formData.priority_id,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          custom_data: Object.keys(formData.custom_data).length > 0 ? formData.custom_data : null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create ticket');
      }

      alert("Ticket created successfully!");
      setShowCreateModal(false);
      const normalPriority = priorities.find(p => p.name === 'normal') || priorities[0];
      const firstCategory = categories[0];
      setFormData({
        category_id: firstCategory?.id || '',
        priority_id: normalPriority?.id || '',
        subject: '',
        description: '',
        custom_data: {},
      });
      setSelectedCategory(firstCategory || null);
      await loadTickets();
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      // Load ticket - explicitly select all fields including updated_at
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories(*),
          priority:support_ticket_priorities(*),
          assigned_to_profile:profiles!support_tickets_assigned_to_fkey(display_name, email)
        `)
        .eq('id', ticketId)
        .eq('user_id', user?.id)
        .single();
      
      // Ensure custom_data is included
      if (ticketData && !ticketData.custom_data) {
        ticketData.custom_data = null;
      }
      
      // Debug log to check if updated_at is present
      console.log('Loaded ticket data:', {
        id: ticketData?.id,
        created_at: ticketData?.created_at,
        updated_at: ticketData?.updated_at,
        has_updated_at: !!ticketData?.updated_at
      });

      if (ticketError) throw ticketError;
      setSelectedTicket(ticketData);

      // Load replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('support_ticket_replies')
        .select(`
          *,
          user:profiles(display_name, email, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .eq('is_internal', false) // Only show non-internal replies to users
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error("Error loading ticket details:", error);
      alert("Failed to load ticket details: " + (error as Error).message);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !newReply.trim() || !user?.id) return;

    setReplying(true);
    try {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newReply.trim(),
          is_admin_reply: false,
        });

      if (error) throw error;

      // Update ticket status if it was resolved/closed
      if (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') {
        await supabase
          .from('support_tickets')
          .update({ status: 'waiting_user' })
          .eq('id', selectedTicket.id);
      }

      setNewReply('');
      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
    } catch (error: any) {
      console.error("Error replying to ticket:", error);
      alert("Failed to send reply: " + error.message);
    } finally {
      setReplying(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !user?.id) return;

    if (!confirm("Are you sure you want to close this ticket? You can reopen it by replying.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'closed',
          closed_by: user.id,
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      alert("Ticket closed successfully!");
      await loadTicketDetails(selectedTicket.id);
      await loadTickets();
    } catch (error: any) {
      console.error("Error closing ticket:", error);
      alert("Failed to close ticket: " + error.message);
    }
  };

  // Apply search filter (already filtered and sorted in loadTickets)
  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Save preferences when filters change
  useEffect(() => {
    if (preferencesLoaded && user?.id) {
      const timeoutId = setTimeout(() => {
        saveUserPreferences();
      }, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [filterStatus, filterCategory, filterPriority, sortBy, dateRange, preferencesLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to access support tickets.</p>
          <Link href="/sign-in" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Support Tickets
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Get help, report bugs, or request features
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Ticket
          </button>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by number, subject, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              </select>
            </div>
            
            {/* Active Filters Display */}
            {(filterStatus !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || dateRange !== 'all') && (
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

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tickets found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowTicketModal(true);
                    loadTicketDetails(ticket.id);
                  }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                          {ticket.ticket_number}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {ticket.subject}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {ticket.category_display_name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[ticket.priority_name] || 'bg-gray-100 text-gray-700'}`}>
                          {ticket.priority_display_name}
                        </span>
                        {ticket.assigned_to_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Assigned to: {ticket.assigned_to_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 min-w-[140px]">
                      <div className="space-y-1">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                            Created
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            <RelativeTime date={ticket.created_at} />
                          </p>
                        </div>
                        {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                              Updated
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              <RelativeTime date={ticket.updated_at} />
                            </p>
                          </div>
                        )}
                        {ticket.reply_count > 0 && (
                          <div className="pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                              Replies
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              {ticket.reply_count} {ticket.reply_count === 1 ? 'reply' : 'replies'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Support Ticket
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    // Reset selected category when closing
                    if (formData.category_id) {
                      const category = categories.find(c => c.id === formData.category_id);
                      setSelectedCategory(category || null);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => {
                      const category = categories.find(c => c.id === e.target.value);
                      console.log('Category changed to:', category);
                      console.log('Category custom_fields:', category?.custom_fields, 'Type:', typeof category?.custom_fields);
                      setSelectedCategory(category || null);
                      setFormData({ 
                        ...formData, 
                        category_id: e.target.value,
                        custom_data: {} // Reset custom data when category changes
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                    ))}
                  </select>
                  {selectedCategory?.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {selectedCategory.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    value={formData.priority_id}
                    onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a priority</option>
                    {priorities.map(pri => (
                      <option key={pri.id} value={pri.id}>{pri.display_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Brief description of your issue or request"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Provide detailed information about your issue, bug, or feature request..."
                  />
                </div>

                {/* Custom Fields based on Category */}
                {(() => {
                  console.log('Rendering custom fields for category:', selectedCategory);
                  
                  // Parse custom_fields if it's a string (JSONB from database)
                  let customFields = selectedCategory?.custom_fields;
                  console.log('Raw custom_fields:', customFields, 'Type:', typeof customFields);
                  
                  if (typeof customFields === 'string') {
                    try {
                      customFields = JSON.parse(customFields);
                      console.log('Parsed custom_fields:', customFields);
                    } catch (e) {
                      console.error('Error parsing custom_fields:', e);
                      customFields = null;
                    }
                  }
                  
                  const hasCustomFields = customFields && Array.isArray(customFields) && customFields.length > 0;
                  console.log('Has custom fields:', hasCustomFields, 'Fields:', customFields);
                  
                  if (!hasCustomFields) {
                    if (selectedCategory) {
                      console.log('No custom fields for category:', selectedCategory.display_name);
                    }
                    return null;
                  }
                  
                  return (
                    <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Additional Information
                      </h3>
                      {customFields.map((field: any, index: number) => {
                      const fieldValue = formData.custom_data[field.name] || '';
                      
                      return (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  custom_data: {
                                    ...formData.custom_data,
                                    [field.name]: e.target.value,
                                  },
                                });
                              }}
                              rows={field.rows || 4}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                              placeholder={field.placeholder || ''}
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  custom_data: {
                                    ...formData.custom_data,
                                    [field.name]: e.target.value,
                                  },
                                });
                              }}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                              placeholder={field.placeholder || ''}
                            />
                          )}
                          {field.help_text && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {field.help_text}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Ticket'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      {selectedTicket.ticket_number}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedTicket.subject}
                    </h2>
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
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {selectedTicket.category_display_name || selectedTicket.category?.display_name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[selectedTicket.priority_name || selectedTicket.priority?.name] || 'bg-gray-100 text-gray-700'}`}>
                      {selectedTicket.priority_display_name || selectedTicket.priority?.display_name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTicketModal(false);
                    setSelectedTicket(null);
                    setReplies([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ticket Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Created
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTicket.created_at ? (
                      <RelativeTime date={selectedTicket.created_at} />
                    ) : (
                      <span className="text-gray-400">Not available</span>
                    )}
                  </p>
                  {selectedTicket.created_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTicket.updated_at ? (
                      <RelativeTime date={selectedTicket.updated_at} />
                    ) : selectedTicket.created_at ? (
                      <RelativeTime date={selectedTicket.created_at} />
                    ) : (
                      <span className="text-gray-400">Not available</span>
                    )}
                  </p>
                  {(selectedTicket.updated_at || selectedTicket.created_at) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(selectedTicket.updated_at || selectedTicket.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Custom Data Display */}
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
                  Replies ({replies.length})
                </h3>
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg ${
                        reply.is_admin_reply
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                          : 'bg-gray-50 dark:bg-gray-900 border-l-4 border-gray-300 dark:border-gray-600'
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

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Reply
                  </label>
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white mb-2"
                    placeholder="Type your reply..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleReply}
                      disabled={!newReply.trim() || replying}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                    {selectedTicket.status !== 'closed' && (
                      <button
                        onClick={handleCloseTicket}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

