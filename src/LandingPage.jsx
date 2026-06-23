import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <div>
            <p className="text-lg font-black text-slate-900 tracking-tight leading-none">VendorBridge</p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Procurement Excellence</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">Features</a>
          <a href="#network" className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">Network</a>
          <a href="#security" className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">Security</a>
        </div>
        <button 
          onClick={onGetStarted}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-600 transition-all shadow-md active:scale-95"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-emerald-50/50 to-transparent blur-3xl"></div>
        <div className="absolute -bottom-48 -left-48 -z-10 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Next-Gen ERP Ecosystem</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Bridge the Gap in <span className="text-emerald-600">Enterprise</span> Procurement.
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
              A high-density, institutional-grade platform for seamless vendor management, RFQ automation, and real-time bid evaluation. Built for transparency and performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="group bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                GET STARTED NOW
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </button>
              <button className="bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center">
                VIEW DEMO
              </button>
            </div>
            <div className="flex items-center gap-8 pt-8 grayscale opacity-50">
              <div className="text-xs font-black uppercase text-slate-400">Trusted By</div>
              <div className="flex items-center gap-6">
                <span className="font-black text-xl italic tracking-tighter">CORP-X</span>
                <span className="font-black text-xl italic tracking-tighter">GLOBAL-N</span>
                <span className="font-black text-xl italic tracking-tighter">SYNERGY</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-emerald-500/10 rounded-[3rem] blur-2xl -z-10"></div>
            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden p-2">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" 
                alt="Dashboard Preview" 
                className="w-full rounded-[2rem] shadow-sm"
              />
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 animate-bounce-slow">
              <p className="text-2xl font-black text-emerald-600">₹4.2Cr</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction Volume</p>
            </div>
            <div className="absolute -top-8 -right-8 bg-slate-900 p-6 rounded-3xl shadow-xl text-white animate-float">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">System Status: Active</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Institutional-Grade Infrastructure</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto italic">Powering the procurement cycle from need identification to final settlement.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Role-Based Portals',
                desc: 'Dedicated interfaces for Admins, Officers, Managers, and Vendors with granular permission controls.',
                icon: '🔑',
                accent: 'bg-emerald-50'
              },
              {
                title: 'Smart Bid Evaluation',
                desc: 'Automated L1 candidate identification and side-by-side technical comparison matrices.',
                icon: '⚖️',
                accent: 'bg-blue-50'
              },
              {
                title: 'Immutable Audit Trail',
                desc: 'Comprehensive logging of every action ensuring full transparency and compliance for every contract.',
                icon: '📜',
                accent: 'bg-amber-50'
              },
              {
                title: 'PO Automation',
                desc: 'Instant generation of professional Purchase Orders and tax-compliant invoices upon approval.',
                icon: '📄',
                accent: 'bg-indigo-50'
              },
              {
                title: 'Real-time Analytics',
                desc: 'Strategic spend analysis and vendor performance tracking at your fingertips.',
                icon: '📊',
                accent: 'bg-rose-50'
              },
              {
                title: 'Secure Onboarding',
                desc: 'Rigorous vendor registration with GST verification and compliance documentation management.',
                icon: '🏢',
                accent: 'bg-teal-50'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-[2rem] border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group">
                <div className={`w-14 h-14 ${feature.accent} rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">V</span>
          </div>
          <span className="text-sm font-black text-slate-900 tracking-tight uppercase">VendorBridge</span>
        </div>
        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">© 2026 VendorBridge Enterprise Core. All Rights Reserved.</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5px, -15px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default LandingPage;
