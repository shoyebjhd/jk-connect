import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { Printer, Edit3, Trash2, ArrowLeft, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import EmptyState, { InvoiceEmptyIcon } from "../components/EmptyState";
import { InvoiceListSkeleton } from "../components/Skeleton";

const STATUS_COLORS = {
  PAID: "badge-glass-success",
  UNPAID: "badge-glass-warning",
  CANCELLED: "badge-glass-destructive",
};

export default function Invoices() {
  const { isFreelancer } = useAuth();
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    startDate: "",
    endDate: "",
    fromAddress: `Abdullah Al Shoyeb\nHolidhani, Jhenaidah, Bangladesh\n+8801915828692\nshoyeb.jhd@gmail.com`,
    toAddress: `LegUp Web Design\nDocklands Innovation Park\nEastwall Enterprise Centre\n128/130 East Wall Road, North Dock\nDublin 3\nTEL:01-4800535`,
    notes: "",
  });

  const [editDialog, setEditDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchClients = async () => {
    try {
      const data = await api("/api/network/connections");
      setClients(data);
    } catch {}
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api("/api/invoices");
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchInvoices();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        clientId: Number(form.clientId),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        fromAddress: form.fromAddress || undefined,
        toAddress: form.toAddress || undefined,
        notes: form.notes || undefined,
      };
      const invoice = await api("/api/invoices/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSelectedInvoice(invoice);
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api(`/api/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAID" }),
      });
      fetchInvoices();
      if (selectedInvoice?.id === id) {
        setSelectedInvoice((prev) => ({ ...prev, status: "PAID" }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = async (invoiceId, data) => {
    try {
      await api(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setEditDialog(null);
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (invoiceId) => {
    try {
      await api(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      setDeleteTarget(null);
      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const EditInvoiceDialog = ({ invoice, open, onOpenChange }) => {
    const [editForm, setEditForm] = useState({
      fromAddress: invoice?.fromAddress || "",
      toAddress: invoice?.toAddress || "",
      notes: invoice?.notes || "",
    });
    const [editing, setEditing] = useState(false);

    useEffect(() => {
      if (invoice) {
        setEditForm({
          fromAddress: invoice.fromAddress || "",
          toAddress: invoice.toAddress || "",
          notes: invoice.notes || "",
        });
      }
    }, [invoice]);

    const handleSave = async () => {
      setEditing(true);
      await handleEdit(invoice.id, {
        fromAddress: editForm.fromAddress || null,
        toAddress: editForm.toAddress || null,
        notes: editForm.notes || null,
      });
      setEditing(false);
      onOpenChange(false);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details for {invoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Address</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={editForm.fromAddress}
                onChange={(e) => setEditForm({ ...editForm, fromAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Address</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={editForm.toAddress}
                onChange={(e) => setEditForm({ ...editForm, toAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editing} className="btn-press">
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const DeleteConfirmDialog = ({ invoice, open, onOpenChange }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{invoice?.invoiceNumber}</strong>?
            This will unlink all time logs and mark them as unbilled. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => {
              handleDelete(invoice.id);
              onOpenChange(false);
            }}
            className="btn-press"
          >
            Delete Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const InvoiceView = ({ invoice, showActions }) => {
    const groups = useMemo(() => {
      if (!invoice.timeLogs?.length) return [];
      const map = {};
      for (const log of invoice.timeLogs) {
        const key = log.project?.name || "Unknown";
        if (!map[key]) map[key] = { projectName: key, rate: log.project?.hourlyRate || 0, logs: [] };
        map[key].logs.push(log);
      }
      return Object.values(map);
    }, [invoice]);

    const totalHours = useMemo(() => {
      if (!invoice.timeLogs?.length) return 0;
      return invoice.timeLogs.reduce((sum, l) => sum + ((l.duration || 0) / 60), 0);
    }, [invoice]);

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden print:border-0">
        <style>{`
          @media print {
            body { background: white !important; }
            header { display: none !important; }
            nav { display: none !important; }
            aside { display: none !important; }
            .no-print { display: none !important; }
            .print-invoice { padding: 0 !important; background: white !important; }
            .print-invoice * { visibility: visible !important; }
          }
        `}</style>
        <div className="print-invoice">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-border text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">JKAAS</span>
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">Professional Services</span>
            </h1>
            <div className="mt-6 mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Invoice</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-0.5">{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="px-8 py-6">
            {/* From / To */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">From</p>
                {invoice.fromAddress ? (
                  <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm whitespace-pre-line leading-relaxed">{invoice.fromAddress}</p>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground italic">Freelancer</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Bill To</p>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  {invoice.toAddress ? (
                    <p className="text-sm whitespace-pre-line leading-relaxed">{invoice.toAddress}</p>
                  ) : (
                    <p className="font-medium">{invoice.client?.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{invoice.client?.name}</p>
                </div>
              </div>
            </div>

            {/* Period */}
            {invoice.startDate && invoice.endDate && (
              <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border/50">
                <FileText className="w-4 h-4" />
                <span>Billing Period: <strong>{new Date(invoice.startDate).toLocaleDateString()}</strong> – <strong>{new Date(invoice.endDate).toLocaleDateString()}</strong></span>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6">
              {groups.map((group) => (
                <div key={group.projectName} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <h3 className="font-semibold text-sm">{group.projectName}</h3>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/70">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Task</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Hours</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Rate</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.logs.map((log, idx) => {
                        const hours = (log.duration || 0) / 60;
                        return (
                          <tr key={log.id} className={`${idx % 2 === 0 ? "bg-background/30" : "bg-muted/20"} border-b border-border/40`}>
                            <td className="py-2.5 px-4">{log.task?.title || "Untitled Task"}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{hours.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">${group.rate.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">${(hours * group.rate).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t-2 border-border pt-4 flex justify-end mb-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total Hours</span>
                  <span className="font-mono tabular-nums">{totalHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Rate</span>
                  <span className="font-mono tabular-nums">Hourly</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-base font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold tabular-nums">${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-end pt-1">
                  <Badge className={STATUS_COLORS[invoice.status]}>{invoice.status}</Badge>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-border pt-4 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Notes</p>
                <p className="text-sm text-muted-foreground italic leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-muted/30 border-t border-border">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>JKAAS &mdash; Professional Services</span>
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="no-print px-8 py-4 bg-background/50 border-t border-border flex flex-wrap gap-2">
            <Button size="sm" onClick={() => window.print()} className="btn-press" variant="outline">
              <Printer className="w-4 h-4 mr-1.5" />
              Print / PDF
            </Button>
            {isFreelancer && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditDialog(invoice)} className="btn-press">
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 btn-press" onClick={() => setDeleteTarget(invoice)}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </>
            )}
            {invoice.status === "UNPAID" && (
              <Button size="sm" onClick={() => handleMarkPaid(invoice.id)} className="btn-press ml-auto">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Mark as Paid
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchInvoices} className="underline hover:no-underline ml-auto">Try again</button>
        </div>
      )}

      {selectedInvoice ? (
        <div>
          <Button variant="outline" className="mb-4 no-print btn-press" onClick={() => setSelectedInvoice(null)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Invoices
          </Button>
          <InvoiceView invoice={selectedInvoice} showActions />
        </div>
      ) : (
        <>
          {isFreelancer && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold mb-4">Generate Invoice</h2>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.userId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">From Address (your address)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={form.fromAddress}
                  onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
                  placeholder={"Abdullah Al Shoyeb\nHolidhani, Jhenaidah, Bangladesh\n+8801915828692\nshoyeb.jhd@gmail.com"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">To Address (client address)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={form.toAddress}
                  onChange={(e) => setForm({ ...form, toAddress: e.target.value })}
                  placeholder={"LegUp Web Design\nDocklands Innovation Park\nEastwall Enterprise Centre\n128/130 East Wall Road, North Dock\nDublin 3\nTEL:01-4800535"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={saving} className="btn-press">
                {saving ? "Generating..." : "Generate Invoice"}
              </Button>
            </form>
          </div>
          )}

          <h2 className="font-semibold mb-4">Past Invoices</h2>

          {loading ? (
            <InvoiceListSkeleton />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<InvoiceEmptyIcon />}
              title="No invoices generated yet"
              description="Generate your first invoice from a client's logged hours."
            />
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all duration-200 card-lift"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{inv.client?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">${inv.amount.toFixed(2)}</span>
                    <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                    <span className="text-sm text-muted-foreground hidden sm:block">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                    {inv.status === "UNPAID" && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(inv.id); }}
                        className="btn-press"
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      {editDialog && (
        <EditInvoiceDialog
          invoice={editDialog}
          open={!!editDialog}
          onOpenChange={(o) => { if (!o) setEditDialog(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirmDialog
          invoice={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}
