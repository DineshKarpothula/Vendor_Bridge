import { useEffect, useState } from 'react';
import LandingPage from './LandingPage';

const API_URL = import.meta.env.VITE_API_URL || 'https://vendor-bridge-f4qr.onrender.com';

function toBackendRole(role) {
  if (role === 'officer') return 'procurement_officer';
  if (role === 'manager') return 'manager';
  return role;
}

function toUiRole(role) {
  if (role === 'procurement_officer') return 'officer';
  if (role === 'manager') return 'manager';
  return role;
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export default function App() {
  // Authentication & Session Routing Core Engine
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('vendorbridge_token') || '');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('landing'); // landing, login, signup, forgot, reset
  const [role, setRole] = useState('officer'); // admin, officer, vendor
  const [showPassword, setShowPassword] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState('');

  // Local Accounts Database Arrays (Pre-seeded with 1 valid account for direct login test)
  const [registeredUsers, setRegisteredUsers] = useState([
    { firstName: 'Dinesh', lastName: 'K', email: 'dinesh@sr.edu.in', password: 'Password123!', role: 'officer' }
  ]);
  const [authError, setAuthError] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [userProfile, setUserProfile] = useState({ firstName: '', lastName: '', email: '' });

  // Core ERP Operational Memory Vaults (Clean Slate System Data)
  const [vendors, setVendors] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [logs, setLogs] = useState([{ text: 'Ecosystem secure clean database running.', time: 'Just now', type: 'System' }]);

  // Form Managed Input Data Structures
  const [loginForm, setLoginForm] = useState({ email: '', password: '', role: 'officer' });
  const [signupForm, setSignupForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', country: '', role: 'officer', additional: '' });
  const [forgotForm, setForgotForm] = useState({ email: '', role: 'officer' });
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  
  // Transaction Panel Input Tunnels
  const [newVendorForm, setNewVendorForm] = useState({ name: '', category: '', gst: '', contact: '', status: 'Active' });
  const [newRfq, setNewRfq] = useState({ title: '', category: '', deadline: '', description: '', item: '', qty: '', price: '' });
  const [vendorQuery, setVendorQuery] = useState('');
  const [bidForm, setBidForm] = useState({ rfqId: '', amount: '', leadTime: '' });

  // Primary Layout Navigation View Controller Toggle
  const [currentView, setCurrentView] = useState('dashboard');

  const hydrateWorkspace = async (token, activeRole) => {
    if (!token) {
      return;
    }

    const mapVendor = (vendor) => ({
      id: vendor._id || vendor.id,
      name: vendor.legalName || vendor.name || '',
      category: vendor.category || '',
      gst: vendor.gstNumber || vendor.gst || '',
      contact: vendor.contactName || vendor.contactEmail || vendor.contact || '',
      status: vendor.status ? vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1) : 'Pending',
      raw: vendor
    });

    const mapRfq = (rfq) => ({
      id: rfq._id || rfq.id,
      title: rfq.title || '',
      category: rfq.category || '',
      deadline: rfq.responseDeadline || rfq.deadline || '',
      description: rfq.description || '',
      item: rfq.items?.[0]?.itemName || rfq.item || 'Unspecified Asset',
      qty: Number(rfq.items?.[0]?.quantity ?? rfq.qty ?? 0),
      price: Number(rfq.items?.[0]?.targetUnitCost ?? rfq.price ?? 0),
      status: rfq.status || 'draft',
      raw: rfq
    });

    const mapQuotation = (quotation) => ({
      id: quotation._id || quotation.id,
      vendor: quotation.vendor?.legalName || quotation.vendor?.name || quotation.vendor || 'Vendor',
      grandTotal: Number(quotation.grandTotal ?? 0),
      delivery: quotation.deliveryDays ?? quotation.delivery ?? 0,
      rating: quotation.status || 'submitted',
      isLowest: quotation.status === 'selected',
      raw: quotation
    });

    const mapVendorRequest = (request) => ({
      text: request.message || request.text || '',
      time: request.createdAt || request.time || 'Just now',
      vendor: request.subject || `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || request.vendor || 'Vendor',
      raw: request
    });

    if (activeRole === 'admin') {
      const [vendorsResponse, rfqsResponse, summaryResponse, logsResponse] = await Promise.all([
        apiRequest('/admin/vendors', { token }),
        apiRequest('/procurement/rfqs', { token }),
        apiRequest('/admin/reports/summary', { token }),
        apiRequest('/admin/audit-logs', { token })
      ]);

      setVendors((vendorsResponse.vendors ?? []).map(mapVendor));
      setRfqs((rfqsResponse.rfqs ?? []).map(mapRfq));
      setQuotations([]);
      setVendorRequests([]);
      setLogs((logsResponse.logs ?? []).map(log => ({
        text: `${log.action} -> ${log.entityType}`,
        time: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now',
        type: 'Audit'
      })));

      return summaryResponse;
    }

    if (activeRole === 'officer') {
      const [rfqsResponse, approvalsResponse, purchaseOrdersResponse, invoicesResponse] = await Promise.all([
        apiRequest('/procurement/rfqs', { token }),
        apiRequest('/procurement/approvals', { token }),
        apiRequest('/procurement/purchase-orders', { token }),
        apiRequest('/procurement/invoices', { token })
      ]);

      setRfqs((rfqsResponse.rfqs ?? []).map(mapRfq));
      setVendors([]);
      setVendorRequests([]);
      setLogs(prev => prev.length > 0 ? prev : [{ text: 'Backend session loaded for procurement officer.', time: 'Just now', type: 'System' }]);

      const firstRfq = rfqsResponse.rfqs?.[0];
      if (firstRfq?._id) {
        const quotationsResponse = await apiRequest(`/procurement/rfqs/${firstRfq._id}/quotations`, { token });
        setQuotations((quotationsResponse.quotations ?? []).map(mapQuotation));
      } else {
        setQuotations([]);
      }

      void approvalsResponse;
      void purchaseOrdersResponse;
      void invoicesResponse;
      return null;
    }

    if (activeRole === 'manager') {
      const [rfqsResponse, approvalsResponse] = await Promise.all([
        apiRequest('/procurement/rfqs', { token }),
        apiRequest('/procurement/approvals', { token })
      ]);

      setRfqs((rfqsResponse.rfqs ?? []).map(mapRfq));
      setLogs(prev => prev.length > 0 ? prev : [{ text: 'Manager dashboard operational.', time: 'Just now', type: 'System' }]);
      return null;
    }

    const [rfqsResponse, requestsResponse, purchaseOrdersResponse, invitationsResponse] = await Promise.all([
      apiRequest('/vendor/rfqs', { token }),
      apiRequest('/vendor/requests', { token }),
      apiRequest('/vendor/purchase-orders', { token }),
      apiRequest('/vendor/invitations', { token })
    ]);

    setRfqs((rfqsResponse.rfqs ?? []).map(mapRfq));
    setVendorRequests((requestsResponse.vendorRequests ?? []).map(mapVendorRequest));
    setVendors([]);
    setQuotations([]);
    setLogs([{ text: 'Vendor portal connected to backend.', time: 'Just now', type: 'System' }]);

    void purchaseOrdersResponse;
    void invitationsResponse;
    return null;
  };

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      if (!authToken) {
        if (isActive) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const session = await apiRequest('/auth/me', { token: authToken });
        if (!isActive) {
          return;
        }

        const uiRole = toUiRole(session.user.role);
        setUserProfile({
          firstName: session.user.firstName || '',
          lastName: session.user.lastName || '',
          email: session.user.email || ''
        });
        setRole(uiRole);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        await hydrateWorkspace(authToken, uiRole);
      } catch {
        localStorage.removeItem('vendorbridge_token');
        if (isActive) {
          setAuthToken('');
          setIsAuthenticated(false);
        }
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  // --- CRYPTOGRAPHIC & STRUCTURAL UTILITY ENGINES ---

  const validateEmailFormat = (emailStr) => {
    const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return strictEmailRegex.test(emailStr.trim().toLowerCase());
  };

  const validatePasswordStrength = (pwdStr) => {
    // Requires: 1 Lowercase, 1 Uppercase, 1 Number, 1 Special Char, Minimum length of 8 characters
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    return strongPasswordRegex.test(pwdStr);
  };

  const generateStrongPassword = (targetForm) => {
    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const numChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+~}{[]:;?><";
    
    let password = "";
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += numChars.charAt(Math.floor(Math.random() * numChars.length));
    password += symbolChars.charAt(Math.floor(Math.random() * symbolChars.length));
    
    const allChars = upperChars + lowerChars + numChars + symbolChars;
    for (let i = 0; i < 6; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    const scrambledPassword = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    setAuthError('');
    if (targetForm === 'signup') {
      setSignupForm({ ...signupForm, password: scrambledPassword });
    } else if (targetForm === 'reset') {
      setResetForm({ ...resetForm, newPassword: scrambledPassword, confirmPassword: scrambledPassword });
    } else {
      setLoginForm({ ...loginForm, password: scrambledPassword });
    }
  };

  // --- COMPONENT DISPATCH OPERATIONS SUBMISSIONS ---

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!validateEmailFormat(loginForm.email)) {
      setAuthError('Security Alert: Please supply a structurally valid real email address.');
      return;
    }

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          email: loginForm.email.trim().toLowerCase(),
          password: loginForm.password
        }
      });

      setAuthToken(response.token);
      localStorage.setItem('vendorbridge_token', response.token);
      setUserProfile({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        email: response.user.email
      });
      setRole(toUiRole(response.user.role));
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      await hydrateWorkspace(response.token, toUiRole(response.user.role));
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!validateEmailFormat(signupForm.email.trim())) {
      setAuthError('Structural Error: This is an invalid email identity mapping format.');
      return;
    }

    if (!validatePasswordStrength(signupForm.password)) {
      setAuthError('Complexity Error: Password MUST include at least one Uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one symbol.');
      return;
    }

    if (toBackendRole(signupForm.role) !== 'admin') {
      setAuthError('Self-registration is currently limited to the initial admin bootstrap. Create officer/vendor users from the admin panel after login.');
      return;
    }

    try {
      const response = await apiRequest('/auth/bootstrap-admin', {
        method: 'POST',
        body: {
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          email: signupForm.email.trim().toLowerCase(),
          password: signupForm.password
        }
      });

      setAuthError(response.message || 'Admin account created. Use the login screen next.');
      setAuthScreen('login');
      setSignupForm({ firstName: '', lastName: '', email: '', password: '', phone: '', country: '', role: 'officer', additional: '' });
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    
    const targetEmail = forgotForm.email.trim().toLowerCase();
    if (!validateEmailFormat(targetEmail)) {
      setAuthError('Error: Invalid structural target verification criteria address.');
      return;
    }

    const userExists = registeredUsers.some(u => u.email.toLowerCase() === targetEmail && u.role === forgotForm.role);
    if (!userExists) {
      setAuthError('Error: This email address is not registered under the selected role database index.');
      return;
    }

    setResetTargetEmail(targetEmail);
    setAuthScreen('reset');
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setAuthError('');

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setAuthError('Security Alert: Password confirmation mismatch.');
      return;
    }

    if (!validatePasswordStrength(resetForm.newPassword)) {
      setAuthError('Complexity Error: New password must fulfill all complexity metrics (Uppercase, Lowercase, Number, Symbol).');
      return;
    }

    // Local placeholder until the backend password reset flow is added.
    setRegisteredUsers(registeredUsers.map(u => {
      if (u.email.toLowerCase() === resetTargetEmail.toLowerCase()) {
        return { ...u, password: resetForm.newPassword };
      }
      return u;
    }));

    alert('Password updated successfully! Please log in using your fresh credentials.');
    setResetForm({ newPassword: '', confirmPassword: '' });
    setAuthScreen('login');
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      const response = await apiRequest('/admin/vendors', {
        method: 'POST',
        token: authToken,
        body: {
          legalName: newVendorForm.name,
          category: newVendorForm.category,
          gstNumber: newVendorForm.gst,
          contactName: newVendorForm.contact,
          status: newVendorForm.status.toLowerCase() === 'active' ? 'active' : 'pending'
        }
      });

      setVendors(prev => [response.vendor, ...prev]);
      setNewVendorForm({ name: '', category: '', gst: '', contact: '', status: 'Active' });
      await hydrateWorkspace(authToken, role);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleCreateRfq = async (e) => {
    e.preventDefault();
    try {
      const response = await apiRequest('/procurement/rfqs', {
        method: 'POST',
        token: authToken,
        body: {
          title: newRfq.title,
          category: newRfq.category,
          description: newRfq.description,
          responseDeadline: newRfq.deadline,
          items: [
            {
              itemName: newRfq.item || newRfq.title,
              quantity: Number(newRfq.qty) || 0,
              targetUnitCost: Number(newRfq.price) || 0
            }
          ]
        }
      });

      setRfqs(prev => [response.rfq, ...prev]);
      setNewRfq({ title: '', category: '', deadline: '', description: '', item: '', qty: '', price: '' });
      await hydrateWorkspace(authToken, role);
      setCurrentView('quotations');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleVendorRequestSubmit = async (e) => {
    e.preventDefault();
    if (!vendorQuery) return;
    try {
      const response = await apiRequest('/vendor/requests', {
        method: 'POST',
        token: authToken,
        body: { message: vendorQuery }
      });

      setVendorRequests(prev => [response.vendorRequest, ...prev]);
      setVendorQuery('');
      await hydrateWorkspace(authToken, role);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendorbridge_token');
    setAuthToken('');
    setIsAuthenticated(false);
    setSelectedApprovalId('');
    setAuthScreen('landing');
    setCurrentView('dashboard');
    setUserProfile({ firstName: '', lastName: '', email: '' });
  };

  const handleStartApprovalWorkflow = async (rfqId, quotationId) => {
    try {
      const response = await apiRequest('/procurement/approvals', {
        method: 'POST',
        token: authToken,
        body: {
          rfqId: rfqId,
          quotationId: quotationId,
          remarks: 'Automated evaluation selection.'
        }
      });

      setSelectedApprovalId(response.approval._id);
      setCurrentView('approvals');
      await hydrateWorkspace(authToken, role);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleBidSubmit = async (rfqId, amount, leadTime) => {
    try {
      await apiRequest('/vendor/quotations', {
        method: 'POST',
        token: authToken,
        body: {
          rfqId: rfqId,
          totalAmount: Number(amount),
          deliveryDays: Number(leadTime)
        }
      });
      alert('Bid submitted successfully!');
      setCurrentView('rfqs');
      await hydrateWorkspace(authToken, role);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleResolveApproval = async (status) => {
    const activeRfq = rfqs[0];

    if (!selectedApprovalId) {
      setAuthError('Open the approval workflow first.');
      return;
    }

    try {
      await apiRequest(`/procurement/approvals/${selectedApprovalId}`, {
        method: 'PATCH',
        token: authToken,
        body: { status }
      });

      if (status === 'approved' && activeRfq && quotations[0]) {
        const purchaseOrderResponse = await apiRequest('/procurement/purchase-orders', {
          method: 'POST',
          token: authToken,
          body: {
            rfqId: activeRfq.raw?._id || activeRfq.id,
            quotationId: quotations[0].raw?._id || quotations[0]._id,
            vendorId: quotations[0].raw?.vendor?._id || quotations[0].raw?.vendor || quotations[0].vendor?._id || quotations[0].vendor,
            cgstRate: 9,
            sgstRate: 9
          }
        });

        await apiRequest('/procurement/invoices', {
          method: 'POST',
          token: authToken,
          body: { purchaseOrderId: purchaseOrderResponse.purchaseOrder._id }
        });

        setCurrentView('invoices');
      } else if (status === 'rejected') {
        setCurrentView('dashboard');
      }

      await hydrateWorkspace(authToken, role);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const activeSubtotal = quotations.length > 0 ? quotations[0].grandTotal : 0;
  const calculatedCgst = activeSubtotal * 0.09;
  const calculatedSgst = activeSubtotal * 0.09;
  const completeGrandTotal = activeSubtotal + calculatedCgst + calculatedSgst;

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-600 font-semibold">
        Loading VendorBridge...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-800 antialiased selection:bg-emerald-200">
      
      {!isAuthenticated ? (
        authScreen === 'landing' ? (
          <LandingPage onGetStarted={() => setAuthScreen('login')} />
        ) : (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl p-8 max-w-md w-full shadow-xl space-y-6">
              
              {/* CENTRAL HIGH VISIBILITY ERRORS BANNER */}
              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs font-bold flex items-start space-x-2.5 shadow-sm">
                  <span className="text-base leading-none">⚠️</span>
                  <span className="leading-normal">{authError}</span>
                </div>
              )}

            {/* SCREEN 1: LOGIN */}
            {authScreen === 'login' && (
              <div className="w-full space-y-5">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 border border-emerald-300 rounded-full mx-auto flex items-center justify-center text-emerald-800 font-bold text-xs uppercase tracking-widest shadow-sm">Photo</div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">VendorBridge Login</h2>
                  <p className="text-xs text-gray-400">Secure role-based enterprise authorization interface</p>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Account System Role Context</label>
                    <select value={loginForm.role} onChange={e => setLoginForm({...loginForm, role: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                      <option value="officer">Procurement Officer</option>
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="manager">Manager / Approver</option>
                    </select>
                  </div>
                  <div>
                    <input required type="text" placeholder="Real Corporate Email Address" value={loginForm.email} onChange={e => {setAuthError(''); setLoginForm({...loginForm, email: e.target.value})}} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm pr-11 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-base grayscale opacity-70 hover:opacity-100">
                      👁️
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <button type="button" onClick={() => generateStrongPassword('login')} className="text-emerald-700 font-bold hover:underline">Suggest strong password</button>
                    <button type="button" onClick={() => { setAuthError(''); setAuthScreen('forgot'); }} className="font-bold text-slate-500 hover:underline">Forgot Password?</button>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold p-3 rounded-xl text-sm shadow-md tracking-wider transition-all hover:bg-emerald-700">Login</button>
                </form>
                <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  New system user? <button onClick={() => { setAuthError(''); setAuthScreen('signup'); }} className="text-emerald-600 font-extrabold hover:underline">Sign Up Account</button>
                </div>
              </div>
            )}

            {/* SCREEN 2: REGISTRATION SIGNUP (POLISHED VISUAL DESIGN MANDATORY FLAGS) */}
            {authScreen === 'signup' && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-100 border border-emerald-300 rounded-full mx-auto flex items-center justify-center text-emerald-800 font-bold text-xs uppercase tracking-widest shadow-sm">Photo</div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Registration Screen</h2>
                  <p className="text-xs text-gray-400">Initialize security clearance profile parameters</p>
                </div>
                <form onSubmit={handleSignupSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="First Name" value={signupForm.firstName} onChange={e => setSignupForm({...signupForm, firstName: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Last Name" value={signupForm.lastName} onChange={e => setSignupForm({...signupForm, lastName: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Real Email Address <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Real Email Address" value={signupForm.email} onChange={e => {setAuthError(''); setSignupForm({...signupForm, email: e.target.value})}} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div className="md:col-span-2 relative">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Account Password <span className="text-red-500">*</span></label>
                    <input required type={showPassword ? "text" : "password"} placeholder="Account Complex Password" value={signupForm.password} onChange={e => setSignupForm({...signupForm, password: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm pr-11 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-7 text-base filter grayscale opacity-70">👁️</button>
                  </div>
                  <div className="md:col-span-2 text-left -mt-2">
                    <button type="button" onClick={() => generateStrongPassword('signup')} className="text-xs text-emerald-700 font-bold hover:underline">Suggest strong password</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Phone Number" value={signupForm.phone} onChange={e => setSignupForm({...signupForm, phone: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Country <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Country" value={signupForm.country} onChange={e => setSignupForm({...signupForm, country: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Assign Core Profile context Context Role <span className="text-red-500">*</span></label>
                    <select required value={signupForm.role} onChange={e => setSignupForm({...signupForm, role: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                      <option value="officer">Procurement Officer</option>
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="manager">Manager / Approver</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    {/* OPTIONAL FIELD NO RED ASTERISK AS REQUESTED */}
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Additional Information</label>
                    <textarea placeholder="Additional Information ...." rows="2" value={signupForm.additional} onChange={e => setSignupForm({...signupForm, additional: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"></textarea>
                  </div>
                  <div className="md:col-span-2 pt-1">
                    <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold p-3 rounded-xl text-sm shadow-md tracking-wider transition-all hover:bg-emerald-700">Register</button>
                  </div>
                </form>
                <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  Already registered account? <button onClick={() => { setAuthError(''); setAuthScreen('login'); }} className="text-emerald-600 font-extrabold hover:underline">Log In</button>
                </div>
              </div>
            )}

            {/* LIVE MODULE: FORGOT PASSWORD REQUEST ENGINE */}
            {authScreen === 'forgot' && (
              <div className="w-full text-center space-y-5">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Forgot Password</h2>
                <p className="text-xs text-gray-400">Verify your structural domain registry index parameters</p>
                <form onSubmit={handleForgotSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Registered Account Role</label>
                    <select value={forgotForm.role} onChange={e => setForgotForm({...forgotForm, role: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white font-semibold text-gray-700 shadow-sm focus:outline-none">
                      <option value="officer">Procurement Officer</option>
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="manager">Manager / Approver</option>
                    </select>
                  </div>
                  <div>
                    <input required type="text" placeholder="Registered Corporate Email Address" value={forgotForm.email} onChange={e => setForgotForm({...forgotForm, email: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm" />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold p-3 rounded-xl text-sm shadow-md hover:bg-emerald-700">Verify & Continue</button>
                </form>
                <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  Return back? <button onClick={() => { setAuthError(''); setAuthScreen('login'); }} className="text-emerald-600 font-bold hover:underline">Go to Login</button>
                </div>
              </div>
            )}

            {/* LIVE MODULE STEP 2: ASSIGN AND COMPOSE FRESH COMPLIANT CREDENTIALS */}
            {authScreen === 'reset' && (
              <div className="w-full text-center space-y-5">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Set New Password</h2>
                <p className="text-xs text-gray-400 font-mono">Modifying parameters for: {resetTargetEmail}</p>
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">New Complex Password *</label>
                    <input required type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters (A-Z, a-z, 0-9, !@#)" value={resetForm.newPassword} onChange={e => setResetForm({...resetForm, newPassword: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Confirm New Password *</label>
                    <input required type={showPassword ? "text" : "password"} placeholder="Verify exact character configurations" value={resetForm.confirmPassword} onChange={e => setResetForm({...resetForm, confirmPassword: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none shadow-sm" />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <button type="button" onClick={() => generateStrongPassword('reset')} className="text-emerald-700 font-bold hover:underline">Suggest strong password</button>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:underline">Toggle Visibility</button>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold p-3 rounded-xl text-sm shadow-md hover:bg-emerald-700">Commit Password Mutation</button>
                </form>
              </div>
            )}

          </div>
        </div>
      )) : userProfile ? (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          {/* ── SIDEBAR ── */}
          <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shadow-sm print:hidden flex-shrink-0">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <span className="text-white font-black text-base">V</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 tracking-tight">VendorBridge</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise ERP</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
              {[
                { label: 'Dashboard', view: 'dashboard', icon: '⚡', roles: ['admin','officer','manager','vendor'] },
                { label: 'Vendor Registry', view: 'vendors', icon: '🏢', roles: ['admin'] },
                { label: 'Procurement RFQs', view: 'rfqs', icon: '📋', roles: ['admin','officer','vendor'] },
                { label: 'Bid Evaluation', view: 'quotations', icon: '⚖️', roles: ['admin','officer'] },
                { label: 'Approvals Queue', view: 'approvals', icon: '✅', roles: ['admin','manager'] },
                { label: 'Purchase Orders', view: 'invoices', icon: '📄', roles: ['admin','officer','manager','vendor'] },
                { label: 'Analytics', view: 'reports', icon: '📊', roles: ['admin','manager'] },
                { label: 'Audit Trail', view: 'activity', icon: '🔍', roles: ['admin'] },
                { label: 'My Requests', view: 'vendor-request', icon: '💬', roles: ['vendor'] },
              ].filter(n => n.roles.includes(role)).map((nav) => (
                <button
                  key={nav.view}
                  onClick={() => setCurrentView(nav.view)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all duration-150 ${
                    currentView === nav.view
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <span className="text-base">{nav.icon}</span>
                  <span>{nav.label}</span>
                </button>
              ))}
            </nav>

            {/* User footer */}
            <div className="px-4 py-5 border-t border-slate-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-black">
                  {userProfile.firstName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{userProfile.firstName} {userProfile.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold capitalize">{role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 border border-slate-100 rounded-xl py-2.5 transition-all hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Topbar */}
            <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between shadow-sm print:hidden flex-shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Portal</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400"> › {currentView.replace('-',' ')}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live</span>
              </div>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto p-8 space-y-8">

              {/* ─── DASHBOARD ─── */}
              {currentView === 'dashboard' && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      {role === 'admin' && 'Admin Command Center'}
                      {role === 'officer' && 'Procurement Dashboard'}
                      {role === 'manager' && 'Manager Approval Hub'}
                      {role === 'vendor' && 'Vendor Portal'}
                    </h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Welcome back, {userProfile.firstName}</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {(role === 'vendor' ? [
                      { label: 'Open Opportunities', value: rfqs.length },
                      { label: 'My Submissions', value: quotations.length },
                      { label: 'Est. Revenue', value: `₹${activeSubtotal.toLocaleString()}` },
                      { label: 'Win Rate', value: '42%' },
                    ] : [
                      { label: 'Active RFQs', value: rfqs.length },
                      { label: 'Awaiting Approval', value: quotations.length },
                      { label: 'Total Spend', value: `₹${completeGrandTotal.toLocaleString()}` },
                      { label: 'System Health', value: '99.9%' },
                    ]).map((card, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-2xl font-black text-slate-900">{card.value}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Activity</h3>
                        <button onClick={() => setCurrentView('rfqs')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">View All</button>
                      </div>
                      {rfqs.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400 font-semibold">No active records found</div>
                      ) : (
                        <div className="space-y-3">
                          {rfqs.slice(0,5).map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center font-black text-emerald-700 text-xs">{r.title.charAt(0)}</div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{r.title}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{r.category || 'General'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-slate-900">₹{(r.qty * r.price).toLocaleString()}</p>
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full uppercase">{r.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-5">Quick Actions</h3>
                      <div className="space-y-2.5">
                        {[
                          { label: 'New RFQ', view: 'rfqs', icon: '📋', roles: ['admin','officer'] },
                          { label: 'Evaluate Bids', view: 'quotations', icon: '⚖️', roles: ['admin','officer'] },
                          { label: 'Approve / Reject', view: 'approvals', icon: '✅', roles: ['admin','manager'] },
                          { label: 'Submit a Bid', view: 'rfqs', icon: '🤝', roles: ['vendor'] },
                          { label: 'View PO / Invoice', view: 'invoices', icon: '📄', roles: ['admin','officer','manager','vendor'] },
                        ].filter(a => a.roles.includes(role)).map((action, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentView(action.view)}
                            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 text-left hover:bg-emerald-600 transition-all group"
                          >
                            <span className="text-xs font-bold">{action.label}</span>
                            <span className="text-base group-hover:scale-125 transition-transform">{action.icon}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── VENDORS (Admin only) ─── */}
              {currentView === 'vendors' && role === 'admin' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Vendor Registry</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Onboard and manage supplier profiles</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-2xl">
                    <h3 className="text-sm font-black text-slate-800 mb-4">Register New Vendor</h3>
                    <form onSubmit={handleAddVendor} className="grid grid-cols-2 gap-4 text-xs">
                      <div className="col-span-2">
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Legal Company Name *</label>
                        <input required type="text" placeholder="e.g. Global Logistics Ltd" value={newVendorForm.name} onChange={e => setNewVendorForm({...newVendorForm, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Category *</label>
                        <input required type="text" placeholder="IT / Logistics / Supply" value={newVendorForm.category} onChange={e => setNewVendorForm({...newVendorForm, category: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">GST Number *</label>
                        <input required type="text" placeholder="22AAAAA0000A1Z5" value={newVendorForm.gst} onChange={e => setNewVendorForm({...newVendorForm, gst: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Contact Person</label>
                        <input type="text" placeholder="Contact Name / Email" value={newVendorForm.contact} onChange={e => setNewVendorForm({...newVendorForm, contact: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Status</label>
                        <select value={newVendorForm.status} onChange={e => setNewVendorForm({...newVendorForm, status: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          <option>Active</option>
                          <option>Pending</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <button type="submit" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-emerald-700 transition-all">Register Vendor</button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                      <h3 className="text-sm font-black text-slate-800">All Vendors ({vendors.length})</h3>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-6 py-3">Company</th>
                          <th className="text-left px-6 py-3">Category</th>
                          <th className="text-left px-6 py-3">GST No.</th>
                          <th className="text-left px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {vendors.length === 0 ? (
                          <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400 font-semibold">No vendors registered yet</td></tr>
                        ) : vendors.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">{v.name}</td>
                            <td className="px-6 py-4 text-slate-500">{v.category}</td>
                            <td className="px-6 py-4 font-mono text-slate-400">{v.gst}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{v.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── RFQs ─── */}
              {currentView === 'rfqs' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">
                      {role === 'vendor' ? 'Bidding Opportunities' : 'Procurement Pipeline'}
                    </h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      {role === 'vendor' ? 'Browse and submit bids on open RFQs' : 'Create and manage Request for Quotations'}
                    </p>
                  </div>

                  {(role === 'admin' || role === 'officer') && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 mb-5">Create New RFQ</h3>
                      <form onSubmit={handleCreateRfq} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="md:col-span-2">
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">RFQ Title *</label>
                          <input required type="text" placeholder="e.g. Q3 Office Hardware Refresh" value={newRfq.title} onChange={e => setNewRfq({...newRfq, title: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold" />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Category</label>
                          <input type="text" placeholder="Hardware / Services / etc" value={newRfq.category} onChange={e => setNewRfq({...newRfq, category: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Deadline *</label>
                          <input required type="text" placeholder="e.g. 30 June 2026" value={newRfq.deadline} onChange={e => setNewRfq({...newRfq, deadline: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Item Name</label>
                          <input type="text" placeholder="Item description" value={newRfq.item} onChange={e => setNewRfq({...newRfq, item: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Quantity</label>
                          <input type="number" placeholder="10" value={newRfq.qty} onChange={e => setNewRfq({...newRfq, qty: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Target Unit Cost (₹)</label>
                          <input type="number" placeholder="5000" value={newRfq.price} onChange={e => setNewRfq({...newRfq, price: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Specifications</label>
                          <textarea rows="3" placeholder="Technical requirements, compliance notes..." value={newRfq.description} onChange={e => setNewRfq({...newRfq, description: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"></textarea>
                        </div>
                        <div className="md:col-span-2">
                          <button type="submit" className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-black transition-all shadow-lg">Dispatch RFQ to Vendors →</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800">Active RFQs ({rfqs.length})</h3>
                    </div>
                    {rfqs.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 font-semibold text-sm">No active RFQs found</div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {rfqs.map((r, i) => (
                          <div key={i} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center font-black text-emerald-700">{r.title.charAt(0)}</div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{r.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{r.category || 'General'}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">Due: {r.deadline}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-xs text-slate-400 font-semibold">Est. Volume</p>
                                <p className="font-black text-slate-800">{r.qty} units</p>
                              </div>
                              {role === 'vendor' ? (
                                <button onClick={() => setCurrentView('bid-submission')} className="bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-sm">Submit Bid</button>
                              ) : (
                                <button onClick={() => setCurrentView('quotations')} className="border border-slate-200 text-slate-500 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all">View Bids</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── BID SUBMISSION (Vendor) ─── */}
              {currentView === 'bid-submission' && (
                <div className="max-w-2xl space-y-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentView('rfqs')} className="text-slate-400 hover:text-slate-700 transition-colors text-sm font-bold">← Back</button>
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">Submit Commercial Bid</h1>
                      <p className="text-xs text-slate-400 font-semibold mt-1">For: {rfqs[0]?.title || 'Selected RFQ'}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Unit Price Offer (₹) *</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="5200" 
                        value={bidForm.amount}
                        onChange={e => setBidForm({...bidForm, amount: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-lg" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Lead Time (Days)</label>
                        <input 
                          type="number" 
                          placeholder="7" 
                          value={bidForm.leadTime}
                          onChange={e => setBidForm({...bidForm, leadTime: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Warranty (Months)</label>
                        <input type="number" placeholder="12" className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">Technical Notes / Remarks</label>
                      <textarea rows="4" placeholder="Compliance details, delivery terms, etc..." className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"></textarea>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <button onClick={() => setCurrentView('rfqs')} className="text-slate-400 font-bold text-xs hover:text-slate-700">Cancel</button>
                      <button 
                        onClick={() => handleBidSubmit(rfqs[0].id, bidForm.amount, bidForm.leadTime)} 
                        className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                      >
                        Transmit Bid →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── QUOTATIONS / BID EVALUATION ─── */}
              {currentView === 'quotations' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Bid Evaluation Matrix</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Side-by-side comparison of vendor submissions</p>
                  </div>
                  {quotations.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center shadow-sm">
                      <p className="text-sm text-slate-400 font-semibold">No bids received yet. Dispatch an RFQ first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {quotations.map((q, i) => {
                        const isL1 = q.grandTotal === Math.min(...quotations.map(b => b.grandTotal));
                        return (
                          <div key={i} className={`relative bg-white rounded-2xl border-2 p-6 hover:shadow-xl transition-all ${isL1 ? 'border-emerald-500 shadow-lg' : 'border-slate-100'}`}>
                            {isL1 && <div className="absolute -top-3 left-5 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full">L1 — LOWEST BID</div>}
                            <h3 className="font-black text-slate-900 text-base mt-2">{q.vendor}</h3>
                            <p className="text-2xl font-black text-emerald-700 mt-4">₹{q.grandTotal.toLocaleString()}</p>
                            <div className="mt-4 space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Delivery</span>
                                <span className="font-bold text-slate-700">{q.delivery} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Status</span>
                                <span className={`font-bold ${q.isLowest ? 'text-emerald-600' : 'text-slate-500'}`}>{q.rating}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => rfqs[0] && handleStartApprovalWorkflow(rfqs[0].id, q.id)} 
                              className={`w-full mt-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isL1 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                              {isL1 ? 'Select & Send for Approval' : 'Compare'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── APPROVALS (Admin + Manager) ─── */}
              {currentView === 'approvals' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Approval Workflow</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Review, authorize or reject pending procurement submissions</p>
                  </div>
                  {rfqs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center shadow-sm">
                      <p className="text-sm text-slate-400 font-semibold">No pending approvals in the queue</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-3">Submission Details</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Title</p>
                            <p className="font-black text-slate-900">{rfqs[0].title}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Selected Vendor</p>
                            <p className="font-black text-emerald-700">{quotations[0]?.vendor || 'Pending Selection'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contract Value</p>
                            <p className="text-2xl font-black text-slate-900">₹{(quotations[0]?.grandTotal || (rfqs[0].qty * rfqs[0].price)).toLocaleString()}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Authorization Remarks *</label>
                          <textarea rows="3" placeholder="Enter approval notes or rejection grounds..." className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"></textarea>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">Compliance Status</p>
                          <p className="text-xs font-bold text-emerald-700 leading-relaxed">All budget limits verified. Vendor onboarding complete. GST & documentation compliance confirmed.</p>
                        </div>
                        <button onClick={() => void handleResolveApproval('approved')} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                          ✓ AUTHORIZE & SIGN OFF
                        </button>
                        <button onClick={() => void handleResolveApproval('rejected')} className="w-full border-2 border-slate-200 text-slate-500 font-black py-4 rounded-xl text-xs tracking-widest hover:bg-slate-50 transition-all">
                          ✕ REJECT SUBMISSION
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── PURCHASE ORDERS / INVOICES ─── */}
              {currentView === 'invoices' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center print:hidden">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">Purchase Orders</h1>
                      <p className="text-xs text-slate-400 font-semibold mt-1">Official procurement documents and invoices</p>
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-black transition-all">Print / Export PDF</button>
                  </div>
                  {rfqs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center shadow-sm">
                      <p className="text-sm text-slate-400 font-semibold">No purchase orders generated yet</p>
                      <p className="text-xs text-slate-300 mt-1">Complete the approval workflow to generate a PO</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-3xl mx-auto shadow-xl print:shadow-none space-y-8 text-xs text-slate-800">
                      <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-6">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">VENDORBRIDGE<span className="text-emerald-600">.</span></h2>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Enterprise Procurement Division</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full">PURCHASE ORDER</span>
                          <p className="font-mono font-black text-slate-900 mt-2">#{`PO-${Date.now().toString().slice(-6)}`}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Buyer</p>
                          <p className="font-black text-slate-900">VendorBridge Corp HQ</p>
                          <p className="text-slate-500 mt-1 leading-relaxed">Enterprise Tower, 12th Floor<br/>Business District, Metro City</p>
                          <p className="text-emerald-700 font-mono font-black text-[10px] mt-2">GSTIN: 22AAAAA0000A1Z5</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Vendor</p>
                          <p className="font-black text-slate-900">{quotations[0]?.vendor || rfqs[0].title}</p>
                          <p className="text-slate-500 mt-1 leading-relaxed">As per registered profile</p>
                        </div>
                      </div>
                      <table className="w-full">
                        <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="text-left px-4 py-2.5">Item</th>
                            <th className="text-center px-4 py-2.5">Qty</th>
                            <th className="text-right px-4 py-2.5">Unit Price</th>
                            <th className="text-right px-4 py-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-bold">{rfqs[0].item || rfqs[0].title}</td>
                            <td className="px-4 py-3 text-center">{rfqs[0].qty}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{rfqs[0].price?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-black font-mono">₹{(rfqs[0].qty * rfqs[0].price).toLocaleString()}</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-slate-50">
                          <tr><td colSpan="3" className="px-4 py-2 text-right font-bold text-slate-500">Subtotal</td><td className="px-4 py-2 text-right font-black font-mono">₹{activeSubtotal.toLocaleString()}</td></tr>
                          <tr><td colSpan="3" className="px-4 py-2 text-right text-slate-500">CGST (9%)</td><td className="px-4 py-2 text-right font-mono">₹{calculatedCgst.toLocaleString()}</td></tr>
                          <tr><td colSpan="3" className="px-4 py-2 text-right text-slate-500">SGST (9%)</td><td className="px-4 py-2 text-right font-mono">₹{calculatedSgst.toLocaleString()}</td></tr>
                          <tr className="border-t-2 border-slate-900"><td colSpan="3" className="px-4 py-3 text-right font-black text-slate-900 text-sm">Grand Total</td><td className="px-4 py-3 text-right font-black font-mono text-emerald-700 text-sm">₹{completeGrandTotal.toLocaleString()}</td></tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── REPORTS ─── */}
              {currentView === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Analytics Hub</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Strategic procurement insights</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                      { title: 'Cost Savings', value: '12.4%', sub: 'vs. previous quarter', accent: 'emerald' },
                      { title: 'Active Vendors', value: vendors.length, sub: 'registered partners', accent: 'blue' },
                      { title: 'Avg. Cycle Time', value: '1.2 days', sub: 'approval turnaround', accent: 'amber' },
                    ].map((m, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.title}</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">{m.value}</p>
                        <p className="text-xs text-slate-400 font-semibold mt-1">{m.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Spend by Category</h3>
                    <div className="space-y-5">
                      {[
                        { name: 'Operations', spend: '₹4,40,000', pct: 75 },
                        { name: 'Engineering', spend: '₹2,10,000', pct: 35 },
                        { name: 'Human Resources', spend: '₹89,000', pct: 15 },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-5">
                          <span className="w-32 text-[10px] font-black uppercase text-slate-600">{row.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{width: `${row.pct}%`}}></div>
                          </div>
                          <span className="w-20 text-right text-xs font-mono font-black text-slate-800">{row.spend}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── AUDIT TRAIL ─── */}
              {currentView === 'activity' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Audit Trail</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Immutable chronological system log</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {logs.map((log, i) => (
                        <div key={i} className="relative pl-8">
                          <div className="absolute left-0 top-1 w-4 h-4 bg-white border-2 border-emerald-400 rounded-full"></div>
                          <p className="text-sm font-bold text-slate-800">{log.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-300 font-semibold">{log.time}</span>
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{log.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── VENDOR REQUESTS (Vendor only) ─── */}
              {currentView === 'vendor-request' && (
                <div className="max-w-xl space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Clarification Requests</h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Submit queries directly to the procurement officer</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <form onSubmit={handleVendorRequestSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your Query *</label>
                        <textarea required rows="4" value={vendorQuery} onChange={e => setVendorQuery(e.target.value)} placeholder="Describe your clarification or concern..." className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"></textarea>
                      </div>
                      <button type="submit" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-xs hover:bg-emerald-700 transition-all shadow-sm">Send to Officer →</button>
                    </form>
                    {vendorRequests.length > 0 && (
                      <div className="border-t border-slate-50 pt-5 mt-5 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent Queries</p>
                        {vendorRequests.map((r, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs">
                            <p className="font-semibold text-slate-700">{r.text}</p>
                            <p className="text-[10px] text-amber-600 font-bold mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded mt-2">Forwarded to officer queue</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      ) : null}
    </div>
  );
}
