import { Code2, Terminal, Database, Cpu, Braces, MonitorCode } from 'lucide-react';

export default function BackgroundIcons() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {/* Top Left */}
      <Code2 className="absolute top-[15%] left-[5%] w-16 h-16 text-blue-500/10 animate-float-1" />
      <Terminal className="absolute top-[30%] left-[15%] w-12 h-12 text-red-500/10 animate-float-2" />
      
      {/* Bottom Left */}
      <Database className="absolute bottom-[20%] left-[8%] w-20 h-20 text-yellow-500/10 animate-float-3" />
      <Braces className="absolute bottom-[10%] left-[25%] w-14 h-14 text-green-500/10 animate-float-1" />
      
      {/* Top Right */}
      <Cpu className="absolute top-[20%] right-[10%] w-24 h-24 text-green-500/10 animate-float-2" />
      <MonitorCode className="absolute top-[40%] right-[5%] w-12 h-12 text-blue-500/10 animate-float-3" />
      
      {/* Bottom Right */}
      <Code2 className="absolute bottom-[25%] right-[15%] w-16 h-16 text-red-500/10 animate-float-1" />
      <Terminal className="absolute bottom-[15%] right-[5%] w-20 h-20 text-yellow-500/10 animate-float-2" />
    </div>
  );
}
