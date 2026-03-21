import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, parseISO } from 'date-fns';
import { EVENT_TYPES } from '../lib/constants';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', type: 'other', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get('/api/events'); setEvents(res.data); } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const padding = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i - 1);
      padding.push({ date: d, isCurrentMonth: false });
    }
    return [...padding, ...days.map(d => ({ date: d, isCurrentMonth: true }))];
  }, [currentDate]);

  const getEventsForDate = (date) => events.filter(e => { try { return isSameDay(parseISO(e.date), date); } catch { return false; } });
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const openCreateDialog = () => {
    setEditingEvent(null);
    setForm({ title: '', date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), type: 'other', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (ev) => {
    setEditingEvent(ev);
    let dateStr = '';
    try { dateStr = format(parseISO(ev.date), 'yyyy-MM-dd'); } catch { dateStr = ev.date || ''; }
    setForm({ title: ev.title || '', date: dateStr, type: ev.type || 'other', description: ev.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) { toast.error('Title and date required'); return; }
    setSaving(true);
    try {
      if (editingEvent) {
        const res = await api.put(`/api/events/${editingEvent.id}`, form);
        setEvents(events.map(e => e.id === editingEvent.id ? res.data : e));
        toast.success('Event updated');
      } else {
        const res = await api.post('/api/events', form);
        setEvents([...events, res.data]);
        toast.success('Event created');
      }
      setDialogOpen(false);
      setEditingEvent(null);
      setForm({ title: '', date: '', type: 'other', description: '' });
    } catch (err) { toast.error('Failed to save event'); } finally { setSaving(false); }
  };

  const handleDelete = async (eventId) => {
    try {
      await api.delete(`/api/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
      toast.success('Event deleted');
      if (editingEvent?.id === eventId) { setDialogOpen(false); setEditingEvent(null); }
    } catch (err) { toast.error('Failed to delete event'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Calendar</h1><p className="text-muted-foreground">Track events, deadlines, and meetings</p></div>
        <Button onClick={openCreateDialog} data-testid="calendar-add-event"><Plus className="mr-2 h-4 w-4" />Add Event</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
                {calendarDays.map(({ date, isCurrentMonth }, i) => {
                  const dayEvents = getEventsForDate(date);
                  const selected = selectedDate && isSameDay(date, selectedDate);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`bg-card p-2 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      } ${selected ? 'ring-2 ring-primary ring-inset' : ''} ${isToday(date) ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-primary font-bold' : ''}`}>{format(date, 'd')}</div>
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <div key={j} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${EVENT_TYPES[ev.type]?.color || 'bg-muted text-muted-foreground'}`}>{ev.title}</div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}</CardTitle></CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground"><CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No events on this day</p></div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map(ev => (
                      <div key={ev.id} className={`p-3 rounded-lg border ${EVENT_TYPES[ev.type]?.color || 'bg-muted'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{ev.title}</p>
                            <p className="text-xs mt-1 capitalize opacity-70">{ev.type}</p>
                            {ev.description && <p className="text-xs mt-1 opacity-60">{ev.description}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(ev)} data-testid={`edit-event-${ev.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.id)} data-testid={`delete-event-${ev.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : <p className="text-sm text-muted-foreground">Click on a day to see events</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">All Events</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No events scheduled</p> : (
                <div className="space-y-2">
                  {events.slice(0, 8).map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" onClick={() => openEditDialog(ev)}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${ev.type === 'payment' ? 'bg-green-500' : ev.type === 'meeting' ? 'bg-purple-500' : ev.type === 'conference' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0"><p className="text-sm truncate">{ev.title}</p></div>
                      <span className="text-xs text-muted-foreground shrink-0">{(() => { try { return format(parseISO(ev.date), 'MMM d'); } catch { return ''; } })()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-center">{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} data-testid="event-title-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} data-testid="event-date-input" /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger data-testid="event-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} data-testid="event-description-input" /></div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingEvent && (
              <Button variant="destructive" size="sm" onClick={() => handleDelete(editingEvent.id)} data-testid="event-delete-btn">
                <Trash2 className="h-4 w-4 mr-1" />Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingEvent(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} data-testid="event-save-btn">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingEvent ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
