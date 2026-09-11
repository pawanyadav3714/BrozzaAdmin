import React, { useState, useMemo } from 'react';
import { 
  Headphones, 
  Search, 
  Filter, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Package, 
  ExternalLink,
  MessageSquare,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { SupportTicket, TicketPriority, TicketStatus, Order } from '../types';

interface SupportViewProps {
  tickets: SupportTicket[];
  onSendMessage: (ticketId: string, text: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  onUpdateTicketPriority: (ticketId: string, priority: TicketPriority) => void;
  onCreateTicket: (newTicket: Partial<SupportTicket>) => void;
  onViewOrderDetails: (orderNumber: string) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  tickets,
  onSendMessage,
  onUpdateTicketStatus,
  onUpdateTicketPriority,
  onCreateTicket,
  onViewOrderDetails
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState('');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  // New ticket form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<any>('order_status');
  const [newPriority, setNewPriority] = useState<TicketPriority>('high');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // Selected ticket
  const activeTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || tickets[0];
  }, [tickets, selectedTicketId]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = 
        t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.orderId && t.orderId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    onSendMessage(activeTicket.id, replyText.trim());
    setReplyText('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTicket({
      customerName: newCustName,
      customerEmail: newCustEmail,
      orderId: newOrderId.trim() || undefined,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'customer',
          senderName: newCustName,
          message: newInitialMsg,
          timestamp: new Date().toISOString()
        }
      ]
    });
    setIsNewTicketModalOpen(false);
    // Reset form
    setNewCustName('');
    setNewCustEmail('');
    setNewOrderId('');
    setNewSubject('');
    setNewInitialMsg('');
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold';
      case 'medium':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'low':
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'open':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'waiting_customer':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Tickets</span>
            <Headphones className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{openTicketsCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requiring support agent intervention</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Urgent Escalations</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{urgentCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">High priority shipping/address queries</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Resolved Cases</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Customer confirmed satisfaction</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Avg Response Speed</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-300 font-mono">14m</p>
          <p className="text-[11px] text-slate-400 mt-1">98.4% SLA compliance</p>
        </div>
      </div>

      {/* Main Split Console: Left List & Right Chat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Filter & Ticket List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          {/* Top Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tickets, customers, order IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => setIsNewTicketModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Ticket Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70 max-h-[520px]">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Headphones className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No support tickets match</p>
              </div>
            ) : (
              filteredTickets.map(t => {
                const isSelected = activeTicket?.id === t.id;
                const lastMsg = t.messages[t.messages.length - 1];

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500' 
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                        {t.ticketNumber}
                        {t.orderId && (
                          <span className="text-[10px] font-normal text-indigo-400">
                            ({t.orderId})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(t.status)}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {t.subject}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="font-medium text-slate-300">{t.customerName}</span>
                      <span>{new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        "{lastMsg.message}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Thread & Reply Box (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          {activeTicket ? (
            <>
              {/* Ticket Top Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono">{activeTicket.ticketNumber}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getPriorityBadge(activeTicket.priority)}`}>
                      {activeTicket.priority}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(activeTicket.status)}`}>
                      {activeTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1">{activeTicket.subject}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>Customer: <strong className="text-slate-200">{activeTicket.customerName}</strong> ({activeTicket.customerEmail})</span>
                  </div>
                </div>

                {/* Linked Order & Status Switchers */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeTicket.orderId && (
                    <button
                      onClick={() => onViewOrderDetails(activeTicket.orderId!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 text-xs font-medium transition"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>View Order {activeTicket.orderId}</span>
                    </button>
                  )}

                  <select
                    value={activeTicket.status}
                    onChange={(e) => onUpdateTicketStatus(activeTicket.id, e.target.value as TicketStatus)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[360px] bg-slate-950/30">
                {activeTicket.messages.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isAgent
                            ? 'bg-indigo-600 text-white rounded-br-xs shadow'
                            : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply as support agent to ${activeTicket.customerName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Headphones className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Select a ticket from the left panel</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Create Support Ticket</h2>
                  <p className="text-xs text-slate-400">Log inquiry or customer service ticket</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTicketModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Marcus Vance"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Customer Email</label>
                  <input
                    type="email"
                    required
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Associated Order # (optional)</label>
                  <input
                    type="text"
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="ORD-98420"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Subject / Issue Summary</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Address change prior to shipping dispatch"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Initial Customer Message / Description</label>
                <textarea
                  required
                  rows={3}
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Details of the customer request..."
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
