import { Construction, Eye } from "lucide-react";

const RTDesigner = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Construction className="w-10 h-10 text-primary" />
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">RT Web Design</h1>
        </div>
        
        <h2 className="text-3xl font-display font-bold mb-4 text-foreground">
          Coming Soon
        </h2>
        
        <p className="text-muted-foreground mb-6">
          Our website is currently under construction. We're working hard to bring you an amazing experience. Stay tuned!
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Under Construction</span>
        </div>
      </div>
    </div>
  );
};

export default RTDesigner;
