"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFirestore } from "@/features/hooks";
import { Lead, Order, Partner } from "@/features/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, User, Briefcase, Handshake } from "lucide-react";

export function GlobalSearch({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const router = useRouter();

  const { data: leads } = useFirestore<Lead>("leads");
  const { data: orders } = useFirestore<Order>("orders");
  const { data: partners } = useFirestore<Partner>("partners");

  const [keys, setKeys] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Handle M + Space shortcut
      if (e.key.toLowerCase() === "m") {
        setKeys(prev => new Set(prev).add("m"));
      }
      if (e.key === " " && keys.has("m")) {
        e.preventDefault();
        setOpen(!open); // Toggle behavior
        setKeys(new Set()); // Reset after action
      }

      // Keep standard Cmd+K as fallback
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") {
        setKeys(prev => {
          const next = new Set(prev);
          next.delete("m");
          return next;
        });
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setOpen, keys]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {leads.length > 0 && (
          <CommandGroup heading="Leads">
            {leads.map((lead) => (
              <CommandItem
                key={lead.id}
                onSelect={() => runCommand(() => router.push(`/leads`))}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{lead.name}</span>
                  <span className="text-[10px] text-muted-foreground">{lead.college} • {lead.phone || "No phone"}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {orders.length > 0 && (
          <CommandGroup heading="Orders">
            {orders.map((order) => (
              <CommandItem
                key={order.id}
                onSelect={() => runCommand(() => router.push(`/orders`))}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{order.topic}</span>
                  <span className="text-[10px] text-muted-foreground">{order.orderId} • {order.clientName}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {partners.length > 0 && (
          <CommandGroup heading="Partners">
            {partners.map((partner) => (
              <CommandItem
                key={partner.id}
                onSelect={() => runCommand(() => router.push(`/partners`))}
              >
                <Handshake className="mr-2 h-4 w-4" />
                <span>{partner.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
