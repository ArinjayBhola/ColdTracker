"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Bell, CheckCheck, Eye, Loader2, Mail, MailOpen, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import type { NotificationPage } from "@/lib/notifications";

const queryKey = ["notifications"];
const mutationKey = ["notification-status"];
type StatusChange = { action: "read" | "unread" | "clear"; id: string } | { action: "read_all" | "clear_all"; through: string };

export function NotificationBell() {
  const pathname = usePathname();
  const client = useQueryClient();
  const inApp = pathname !== "/" && !pathname.startsWith("/signin") && !pathname.startsWith("/signup");
  useEffect(() => {
    if (!inApp) {
      // Clear account data on sign-out, without disrupting Strict Mode remounts.
      void client.cancelQueries({ queryKey });
      client.removeQueries({ queryKey });
    }
  }, [inApp, client]);
  if (!inApp) return null;
  return <NotificationInbox />;
}

function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const { toast } = useToast();
  const channel = useRef<BroadcastChannel | null>(null);
  const newestSeen = useRef<{ at: string; id: string } | null>(null);
  const liveToast = useRef<ReturnType<typeof toast> | null>(null);
  const read = useMutation({
    mutationKey,
    scope: { id: "notification-status" },
    mutationFn: async (action: StatusChange) => {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      if (!response.ok) throw new Error("Could not update notification status");
    },
    onMutate: async action => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<InfiniteData<NotificationPage>>(queryKey);
      client.setQueryData<InfiniteData<NotificationPage>>(queryKey, current => {
        if (!current) return current;
        const item = "id" in action ? current.pages.flatMap(page => page.items).find(item => item.id === action.id) : undefined;
        const difference = !("id" in action) ? -(current.pages[0]?.unreadCount ?? 0)
          : item ? action.action === "unread" ? (item.readAt ? 1 : 0) : (item.readAt ? 0 : -1) : 0;
        return { ...current, pages: current.pages.map(page => ({
          ...page,
          unreadCount: Math.max(0, page.unreadCount + difference),
          items: page.items.filter(item => action.action === "clear" ? item.id !== action.id : action.action === "clear_all" ? item.createdAt > action.through : true).map(item => {
            const matches = "id" in action ? item.id === action.id : item.createdAt <= action.through;
            return matches ? { ...item, readAt: action.action === "unread" ? null : new Date().toISOString() } : item;
          }),
        })) };
      });
      return { previous };
    },
    onSuccess: (_data, action) => {
      if (action.action === "clear" || action.action === "clear_all") liveToast.current?.dismiss();
      channel.current?.postMessage("status-changed");
    },
    onError: (_error, _action, context) => {
      if (client.isMutating({ mutationKey }) === 1 && context?.previous) client.setQueryData(queryKey, context.previous);
      toast({ title: "Could not save notification status", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) void client.invalidateQueries({ queryKey });
    },
  });
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<NotificationPage> => {
      const response = await fetch(`/api/notifications${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Notifications unavailable");
      return response.json();
    },
    getNextPageParam: page => page.nextCursor,
    enabled: !read.isPending,
    staleTime: 3000,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("coldtrack-notifications");
      channel.current.onmessage = () => void client.invalidateQueries({ queryKey });
    }
    return () => {
      channel.current?.close();
      channel.current = null;
      liveToast.current?.dismiss();
    };
  }, [client]);

  const firstPage = query.data?.pages[0];
  const changeStatus = read.mutate;
  useEffect(() => {
    if (!firstPage) return;
    const newest = firstPage.items[0];
    if (!newestSeen.current) {
      // Establish a baseline: opening the app must not toast old inbox history.
      newestSeen.current = newest ? { at: newest.createdAt, id: newest.id } : { at: firstPage.through, id: "" };
      return;
    }
    const previous = newestSeen.current;
    const arrivals = firstPage.items.filter(item => item.createdAt > previous.at || (item.createdAt === previous.at && item.id > previous.id));
    if (!arrivals.length) return;
    newestSeen.current = { at: arrivals[0].createdAt, id: arrivals[0].id };
    const item = arrivals.find(item => !item.readAt);
    if (!item) return;
    liveToast.current = toast({
      title: `Open detected for ${item.personName || item.recipient}`,
      href: `/outreach/${item.outreachId}#email-activity`,
      duration: 8000,
      onNavigate: () => {
        changeStatus({ action: "read", id: item.id });
        setOpen(false);
      },
    });
  }, [firstPage, changeStatus, toast]);
  const unread = firstPage?.unreadCount ?? 0;
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];

  return (
    <Popover open={open} onOpenChange={value => { setOpen(value); if (value && !read.isPending) void query.refetch(); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="fixed right-16 top-4 z-40 h-9 w-9 rounded-full bg-background shadow-sm md:right-[4.5rem]" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} title="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span key={unread} aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background animate-in zoom-in duration-200 motion-reduce:animate-none">{unread > 99 ? "99+" : unread}</span>}
          {query.isError && !unread && <span aria-hidden="true" className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <span className="sr-only" role="status" aria-live="polite">{unread ? `${unread} unread notifications` : ""}</span>
      <PopoverContent align="end" sideOffset={12} collisionPadding={12} className="w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border-border/60 bg-card p-0 shadow-xl">
        <div className="border-b px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">Notifications{unread > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{unread}</span>}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Refresh notifications" disabled={query.isFetching || read.isPending} onClick={() => void query.refetch()}><RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${query.isError ? "bg-amber-500" : "bg-emerald-500"}`} />{query.isError ? "Reconnecting" : "Updates automatically"}</p>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-primary" disabled={!unread || !firstPage || read.isPending} onClick={() => firstPage && read.mutate({ action: "read_all", through: firstPage.through })}><CheckCheck className="h-3.5 w-3.5" />Mark all read</Button>
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive" disabled={!items.length || !firstPage || read.isPending} onClick={() => firstPage && read.mutate({ action: "clear_all", through: firstPage.through })}><Trash2 className="h-3.5 w-3.5" />Clear all</Button>
          </div>
        </div>
        <div className="max-h-[min(65dvh,32rem)] overflow-y-auto overscroll-contain">
          {query.isPending ? <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading notifications...</p> : null}
          {query.isError && <div role="alert" className="space-y-2 border-b bg-destructive/5 p-4 text-xs text-destructive"><p>Could not refresh notifications.{items.length ? " Displayed activity may be out of date." : " Please try again."}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Try again</Button></div>}
          {!query.isPending && !query.isError && !items.length && <div className="px-6 py-10 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5"><Bell className="h-5 w-5 text-primary/70" /></div><p className="text-sm font-semibold">No notifications yet</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">When an open is detected for a tracked email, it will appear here.</p></div>}
          <ul className="space-y-1 p-2">
            {items.map(item => <li key={item.id} className={`flex items-center gap-1 rounded-2xl pr-2 transition-colors duration-500 motion-reduce:transition-none ${!item.readAt ? "bg-primary/[0.08]" : "bg-transparent"}`}>
              <Link href={`/outreach/${item.outreachId}#email-activity`} onClick={() => { if (!item.readAt) read.mutate({ action: "read", id: item.id }); setOpen(false); liveToast.current?.dismiss(); }} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-4 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 motion-reduce:transition-none ${!item.readAt ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground/70"}`}><Eye className="h-4 w-4" /></span>
                <p className={`min-w-0 break-words text-sm leading-relaxed transition-colors duration-500 motion-reduce:transition-none ${!item.readAt ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Open detected for <span className="[overflow-wrap:anywhere]">{item.personName || item.recipient}</span><span className="sr-only"> — {item.readAt ? "Read" : "Unread"}</span></p>
              </Link>
              <Button variant="ghost" size="icon" className={`h-8 w-8 shrink-0 rounded-full hover:bg-background/80 ${!item.readAt ? "text-primary" : "text-muted-foreground"}`} disabled={read.isPending} aria-label={`${item.readAt ? "Mark unread" : "Mark read"}: ${item.personName || item.recipient}`} title={item.readAt ? "Mark unread" : "Mark read"} onClick={() => read.mutate({ action: item.readAt ? "unread" : "read", id: item.id })}>
                {item.readAt ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:bg-background/80 hover:text-destructive" disabled={read.isPending} aria-label={`Clear notification: ${item.personName || item.recipient}`} title="Clear notification" onClick={() => read.mutate({ action: "clear", id: item.id })}><X className="h-3.5 w-3.5" /></Button>
            </li>)}
          </ul>
          {query.hasNextPage && <div className="p-3 text-center"><Button variant="ghost" size="sm" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading..." : "Load older notifications"}</Button></div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
