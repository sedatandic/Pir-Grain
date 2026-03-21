import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Plus, Loader2, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', description: '', type: 'general' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/api/events');
        setEvents(res.data);
      } catch (err) {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.date) { toast.error('Title and date are required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/events', form);
      setEvents([...events, res.data]);
      toast.success('Event created');
      setDialogOpen(false);
      setForm({ title: '', date: '', time: '', description: '', type: 'general' });
    } catch (err) {
      toast.error('Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const selectedDayEvents = events.filter(e => {
    try {
      return isSameDay(parseISO(e.date), selectedDate);
    } catch { return false; }
  });

  const eventDates = events.map(e => {
    try { return parseISO(e.date); } catch { return null; }
  }).filter(Boolean);

  const typeColors = {
    meeting: 'bg-blue-500',
    deadline: 'bg-amber-500',
    payment: 'bg-emerald-500',
    vessel: 'bg-cyan-500',
    general: 'bg-slate-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-slate-500 text-sm">Track events, deadlines, and meetings</p>
        </div>
        <Button onClick={() => { setForm({ ...form, date: format(selectedDate, 'yyyy-MM-dd') }); setDialogOpen(true); }} className="bg-[#0e7490] hover:bg-[#155e75]">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-5">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                modifiers={{ hasEvent: eventDates }}
                modifiersStyles={{ hasEvent: { fontWeight: 'bold', textDecoration: 'underline', textDecorationColor: '#0e7490' } }}
                className="rounded-md"
              />
            </CardContent>
          </Card>
        </div>

        {/* Events for selected day */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-teal-600" />
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No events on this day</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setForm({ ...form, date: format(selectedDate, 'yyyy-MM-dd') }); setDialogOpen(true); }}>
                    Add an event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${typeColors[event.type] || typeColors.general}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.title}</p>
                        {event.time && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {event.time}
                          </p>
                        )}
                        {event.description && <p className="text-xs text-slate-500 mt-1">{event.description}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{event.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All upcoming events */}
          <Card className="shadow-sm mt-4">
            <CardHeader><CardTitle className="text-lg">All Upcoming Events</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-slate-500 text-sm">No upcoming events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-slate-100">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[event.type] || typeColors.general}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{event.title}</p>
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {(() => { try { return format(parseISO(event.date), 'MMM d'); } catch { return event.date; } })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Event title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="vessel">Vessel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-[#0e7490] hover:bg-[#155e75]">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
