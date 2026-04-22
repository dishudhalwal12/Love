"use client";

import { useFirestore } from "@/features/hooks";
import { Order } from "@/features/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Search, LayoutGrid, List, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { orderBy } from "firebase/firestore";

export default function ProjectsPage() {
  const { data: orders, loading } = useFirestore<Order>("orders", [orderBy("createdAt", "desc")]);
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter(order => 
    order.topic.toLowerCase().includes(search.toLowerCase()) || 
    order.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">High-level view of ongoing project development.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-8 bg-card border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-muted/30 p-1 rounded-md border border-border/50">
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-background shadow-sm">
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-xl">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No active projects</h3>
          <p className="text-sm text-muted-foreground mt-1">Convert leads into orders to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <Card key={order.id} className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm flex flex-col group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {order.status}
                  </Badge>
                  {order.riskScore && order.riskScore > 50 && (
                    <Badge variant="outline" className="bg-status-urgent/10 text-status-urgent border-status-urgent/30">
                      At Risk
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2" title={order.topic}>{order.topic || "Untitled Project"}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span>{order.clientName}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">{order.orderId}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    <span className="flex-1">Deadline</span>
                    <span className="font-medium text-foreground">{order.deadline}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {order.amount > 0 ? Math.round((order.amountPaid / order.amount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${order.amount > 0 ? Math.round((order.amountPaid / order.amount) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border/10 p-4">
                <Button variant="secondary" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Workspace
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
