"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiSearch, FiGrid, FiList } from "react-icons/fi";
import { TemplateFormDialog } from "./template-form-dialog";
import { deleteTemplateAction, massDeleteTemplatesAction } from "@/actions/templates";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Template = {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
};

export function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "details">("details");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingMass, setIsDeletingMass] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState<{ isOpen: boolean; isMassDelete: boolean; singleId?: string }>({ isOpen: false, isMassDelete: false });

  const { toast } = useToast();
  const router = useRouter();

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const lowerQuery = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) || 
      t.subjectTemplate.toLowerCase().includes(lowerQuery) ||
      t.bodyTemplate.toLowerCase().includes(lowerQuery)
    );
  }, [templates, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleMassDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setDeletePrompt({ isOpen: true, isMassDelete: true });
  };

  const handleDeleteClick = (id: string) => {
    setDeletePrompt({ isOpen: true, isMassDelete: false, singleId: id });
  };

  const confirmDelete = async () => {
    if (deletePrompt.isMassDelete) {
      setIsDeletingMass(true);
      const idsArray = Array.from(selectedIds);
      const res = await massDeleteTemplatesAction(idsArray);
      setIsDeletingMass(false);
  
      if (res.success) {
        setTemplates(templates.filter(t => !selectedIds.has(t.id)));
        setSelectedIds(new Set());
        toast({ title: `Deleted ${idsArray.length} templates` });
        router.refresh();
      } else {
        toast({ title: "Error", description: "Failed to delete templates", variant: "destructive" });
      }
    } else if (deletePrompt.singleId) {
      const id = deletePrompt.singleId;
      const res = await deleteTemplateAction(id);
      if (res.success) {
        setTemplates(templates.filter(t => t.id !== id));
        toast({ title: "Template deleted" });
        router.refresh();
      } else {
        toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
      }
    }
    setDeletePrompt({ isOpen: false, isMassDelete: false });
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search templates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 backdrop-blur-sm"
            />
          </div>
          <div className="flex items-center bg-background/50 backdrop-blur-sm rounded-md border p-1 shrink-0">
            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-sm ${viewMode === 'details' ? 'bg-muted shadow-sm' : 'hover:bg-muted/50'}`} onClick={() => setViewMode('details')}>
              <FiList className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-sm ${viewMode === 'grid' ? 'bg-muted shadow-sm' : 'hover:bg-muted/50'}`} onClick={() => setViewMode('grid')}>
              <FiGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <Button variant="destructive" className="gap-2 shrink-0" onClick={handleMassDeleteClick} disabled={isDeletingMass}>
              <FiTrash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button onClick={handleCreateNew} className="gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex-1 sm:flex-none">
            <FiPlus className="w-5 h-5" />
            Create Template
          </Button>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed bg-muted/20 hover:bg-muted/30 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground min-h-[300px]">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <FiFileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No templates found</h3>
            <p className="max-w-sm mb-6">Create your first email template to save time on your outreach pipeline.</p>
            <Button onClick={handleCreateNew} className="gap-2 font-semibold">
              <FiPlus className="w-4 h-4" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "details" ? (
        <div className="rounded-xl border bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Subject Template</TableHead>
                <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map(template => (
                <TableRow key={template.id} className="group hover:bg-muted/20 transition-colors">
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.has(template.id)} 
                      onCheckedChange={() => toggleSelect(template.id)} 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] sm:max-w-[500px] truncate">{template.subjectTemplate}</TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleEdit(template)}>
                        <FiEdit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDeleteClick(template.id)}>
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="group relative overflow-hidden flex flex-col hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      className="mt-1"
                      checked={selectedIds.has(template.id)}
                      onCheckedChange={() => toggleSelect(template.id)}
                    />
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold leading-none tracking-tight">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-1 text-xs font-medium text-muted-foreground/80">{template.subjectTemplate}</CardDescription>
                    </div>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:scale-110 transition-transform">
                    <FiFileText className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-5 pt-2">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 h-[120px] overflow-hidden relative cursor-pointer" onClick={() => toggleSelect(template.id)}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {template.bodyTemplate}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 p-4 pt-3 border-t border-border/10 bg-muted/5">
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors font-medium" onClick={() => handleEdit(template)}>
                  <FiEdit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive transition-colors font-medium" onClick={() => handleDeleteClick(template.id)}>
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={editingTemplate}
        onSuccess={(saved) => {
          if (editingTemplate) {
            setTemplates(templates.map(t => t.id === saved.id ? saved : t));
          } else {
            setTemplates([saved, ...templates]);
          }
          router.refresh();
        }}
      />

      <Dialog open={deletePrompt.isOpen} onOpenChange={(isOpen) => setDeletePrompt({ ...deletePrompt, isOpen })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deletePrompt.isMassDelete 
                ? `Are you sure you want to delete ${selectedIds.size} templates? This action cannot be undone.` 
                : "Are you sure you want to delete this template? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePrompt({ isOpen: false, isMassDelete: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeletingMass}>
              {isDeletingMass ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
