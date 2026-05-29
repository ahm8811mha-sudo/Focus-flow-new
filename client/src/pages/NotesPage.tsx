import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Search, Pin, Trash2, Edit2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface NoteForm {
  title: string;
  content: string;
  tags: string;
}

export default function NotesPage() {
  const [searchText, setSearchText] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [formData, setFormData] = useState<NoteForm>({
    title: "",
    content: "",
    tags: "",
  });

  const notesQuery = trpc.notes.list.useQuery();
  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      resetForm();
      setShowAddNote(false);
    },
  });
  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      resetForm();
      setEditingNote(null);
    },
  });
  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
    },
  });

  const notes = notesQuery.data || [];

  const filteredNotes = notes.filter(note =>
    note.title.includes(searchText) ||
    note.content?.includes(searchText) ||
    note.tags?.includes(searchText)
  );

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      tags: "",
    });
  };

  const handleAddNote = async () => {
    if (!formData.title.trim()) return;

    try {
      await createNoteMutation.mutateAsync({
        title: formData.title,
        content: formData.content || undefined,
        tags: formData.tags || undefined,
      });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!formData.title.trim()) return;

    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        title: formData.title,
        content: formData.content || undefined,
        tags: formData.tags || undefined,
      });
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
      try {
        await deleteNoteMutation.mutateAsync({ id: noteId });
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  };

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        isPinned: !isPinned,
      });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    let html = text
      .replace(/^### (.*?)$/gm, '<h3 className="font-bold text-lg mt-2">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 className="font-bold text-xl mt-2">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1 className="font-bold text-2xl mt-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code className="bg-muted px-1 rounded">$1</code>')
      .replace(/\n/g, '<br />');
    return html;
  };

  const NoteCard = ({ note, isPinned = false }: { note: any; isPinned?: boolean }) => (
    <Card className={`p-4 hover:shadow-md transition-shadow ${isPinned ? "border-accent" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg flex-1">{note.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleTogglePin(note.id, note.isPinned)}
            className={`p-2 rounded-lg transition-colors ${
              note.isPinned
                ? "bg-accent/10 text-accent"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setFormData({
                title: note.title,
                content: note.content || "",
                tags: note.tags || "",
              });
              setEditingNote(note.id);
              setShowAddNote(true);
            }}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteNote(note.id)}
            className="p-2 hover:bg-red-100 rounded-lg text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {note.content && (
        <div className="mb-3 text-sm text-muted-foreground line-clamp-3">
          {note.content}
        </div>
      )}

      {note.tags && (
        <div className="flex gap-2 flex-wrap">
          {note.tags.split(",").map((tag: string, idx: number) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
            >
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الملاحظات</h1>
          <p className="text-muted-foreground mt-1">
            {notes.length} ملاحظة
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setEditingNote(null);
          setShowAddNote(true);
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          ملاحظة جديدة
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث في الملاحظات..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-3 pr-10 py-2 border rounded-lg bg-background"
        />
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">الملاحظات المثبتة</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} isPinned={true} />
            ))}
          </div>
        </div>
      )}

      {/* All Notes */}
      {unpinnedNotes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">جميع الملاحظات</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد ملاحظات</p>
        </div>
      )}

      {/* Add/Edit Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "تعديل الملاحظة" : "ملاحظة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">العنوان *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="أدخل عنوان الملاحظة"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              />
            </div>

            <div>
              <label className="text-sm font-medium">المحتوى (يدعم Markdown)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="أدخل محتوى الملاحظة...

يدعم:
# العنوان الكبير
## العنوان الصغير
**نص غامق**
*نص مائل*
`كود`"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background h-48 resize-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الوسوم (مفصولة بفواصل)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="مثال: عمل، أفكار، مهم"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              />
            </div>

            {formData.content && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">معاينة:</p>
                <div className="prose prose-sm max-w-none text-sm">
                  {formData.content.split("\n").map((line, i) => (
                    <p key={i} className="mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddNote(false);
              resetForm();
              setEditingNote(null);
            }}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (editingNote) {
                  handleUpdateNote(editingNote);
                } else {
                  handleAddNote();
                }
              }}
              disabled={!formData.title.trim()}
            >
              {editingNote ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
