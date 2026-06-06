import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function toBackendRole(role) {
  return role === 'officer' ? 'procurement_officer' : role;
}

function toUiRole(role) {
  return role === 'procurement_officer' ? 'officer' : role;
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
  const [authScreen, setAuthScreen] = useState('login'); // login, signup, forgot, reset
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
    setAuthScreen('login');
    setCurrentView('dashboard');
    setUserProfile({ firstName: '', lastName: '', email: '' });
  };

  const handleStartApprovalWorkflow = async () => {
    const activeRfq = rfqs[0];

    if (!activeRfq) {
      setAuthError('Create an RFQ first.');
      return;
    }

    try {
      const response = await apiRequest('/procurement/approvals', {
        method: 'POST',
        token: authToken,
        body: {
          rfqId: activeRfq.raw?._id || activeRfq.id,
          quotationId: quotations[0]?.raw?._id || quotations[0]?._id || null,
          remarks: 'Initiated from frontend approval workflow.'
        }
      });

      setSelectedApprovalId(response.approval._id);
      setCurrentView('approvals');
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
                  <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold p-3 rounded-xl text-sm shadow-md tracking-wider transition-all hover:bg-emerald-700">Login Button</button>
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
      ) : (
        /* INNER APP SECURE BOUNDS WORKFLOW ENGINE (ROLE IS PERMANENTLY LOCKED TO SESSION HOOKS) */
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="bg-emerald-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm print:hidden">
            <span className="text-2xl font-black tracking-tight text-emerald-800">VendorBridge</span>
            <div className="flex items-center space-x-6">
              <div className="text-right text-xs">
                <p className="font-bold text-gray-900">{userProfile.firstName || 'User'} {userProfile.lastName || ''}</p>
                <p className="text-gray-400 font-mono tracking-tight">{userProfile.email}</p>
                <p className="text-emerald-800 uppercase text-[9px] font-black bg-emerald-100 px-2.5 py-0.5 rounded-md mt-0.5 inline-block tracking-wider">Session Key context Context: {role}</p>
              </div>
              <button onClick={handleLogout} className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-1.5 bg-white shadow-sm hover:bg-gray-50 transition-colors">Sign Out</button>
            </div>
          </header>

          <div className="flex flex-1">
            <aside className="w-64 bg-white border-r border-gray-200 p-4 space-y-1 print:hidden">
              <nav className="space-y-1">
                <button onClick={() => setCurrentView('dashboard')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'dashboard' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Dashboard</button>
                {(role === 'officer' || role === 'admin') && (
                  <>
                    <button onClick={() => setCurrentView('vendors')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'vendors' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Vendors</button>
                    <button onClick={() => setCurrentView('rfqs')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'rfqs' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- RFQ's</button>
                    <button onClick={() => setCurrentView('quotations')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'quotations' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Quotations</button>
                    <button onClick={() => setCurrentView('approvals')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'approvals' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Approvals</button>
                  </>
                )}
                {role === 'vendor' && (
                  <button onClick={() => setCurrentView('vendor-request')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'vendor-request' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Request to Officer</button>
                )}
                <button onClick={() => setCurrentView('invoices')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'invoices' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Purchase orders</button>
                <button onClick={() => setCurrentView('reports')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'reports' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Reports</button>
                <button onClick={() => setCurrentView('activity')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${currentView === 'activity' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600 hover:bg-gray-50'}`}>- Activity</button>
              </nav>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto print:p-0">
              {currentView === 'dashboard' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs text-gray-400">Welcome back — Realtime Activity Tracker</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-2xl font-black text-gray-900">{rfqs.length}</p><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Active RFQ's</p></div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-2xl font-black text-amber-600">{rfqs.length > 0 ? 1 : 0}</p><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Pending Approvals</p></div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-2xl font-black text-emerald-800">₹ {completeGrandTotal.toLocaleString()}</p><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">PO Allocation Value</p></div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-2xl font-black text-gray-300">0</p><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Overdue Invoices</p></div>
                  </div>

                  <div className="bg-white border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4">Live Active Pipeline Records</h3>
                    {rfqs.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center font-medium">No active purchase orders or workflow cycles open. Start by onboarding your specific data.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead><tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider"><th className="pb-3">RFQ ID</th><th className="pb-3">Scope Project</th><th className="pb-3">Est Total Base</th><th className="pb-3">Status Flag</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {rfqs.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="py-3.5 font-mono font-bold text-emerald-700">{r.id}</td>
                              <td className="font-semibold text-gray-800">{r.title}</td>
                              <td className="font-medium">₹ {(r.qty * r.price).toLocaleString()}</td>
                              <td><span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-bold text-[10px] tracking-wide border border-amber-100">{r.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'vendors' && (
                <div className="space-y-6">
                  <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-xl">
                    <h3 className="text-sm font-black tracking-tight text-gray-800 mb-4">Onboard Supplier Entry</h3>
                    <form onSubmit={handleAddVendor} className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="col-span-2"><input required type="text" placeholder="Vendor Corporate Name" value={newVendorForm.name} onChange={e => setNewVendorForm({...newVendorForm, name: e.target.value})} className="w-full border p-3 rounded-xl focus:outline-emerald-500" /></div>
                      <div><input required type="text" placeholder="Category (e.g. IT, Logistics)" value={newVendorForm.category} onChange={e => setNewVendorForm({...newVendorForm, category: e.target.value})} className="w-full border p-3 rounded-xl focus:outline-emerald-500" /></div>
                      <div><input required type="text" placeholder="GST Number" value={newVendorForm.gst} onChange={e => setNewVendorForm({...newVendorForm, gst: e.target.value})} className="w-full border p-3 rounded-xl focus:outline-emerald-500 font-mono" /></div>
                      <div><input type="text" placeholder="Contact Details" value={newVendorForm.contact} onChange={e => setNewVendorForm({...newVendorForm, contact: e.target.value})} className="w-full border p-3 rounded-xl focus:outline-emerald-500" /></div>
                      <div>
                        <select value={newVendorForm.status} onChange={e => setNewVendorForm({...newVendorForm, status: e.target.value})} className="w-full border p-3 rounded-xl bg-white focus:outline-none">
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>
                      <div className="col-span-2 pt-2"><button type="submit" className="bg-emerald-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-sm tracking-wide">Register Vendor Profile</button></div>
                    </form>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-xl font-bold tracking-tight">Vendors Ledger Index</h1>
                    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-wider text-gray-400"><tr><th className="p-4">Vendor Name</th><th className="p-4">Category</th><th className="p-4">GST no.</th><th className="p-4">Status</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {vendors.length === 0 ? (
                            <tr><td colSpan="4" className="p-5 text-center text-gray-400 font-medium">No supplier profiles found inside storage buffers. Populate utilizing configuration frame wizard block.</td></tr>
                          ) : (
                            vendors.map(v => (
                              <tr key={v.id} className="hover:bg-slate-50/40">
                                <td className="p-4 font-bold text-slate-800">{v.name}</td>
                                <td className="p-4 text-gray-600">{v.category}</td>
                                <td className="p-4 font-mono text-gray-500">{v.gst}</td>
                                <td className="p-4"><span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${v.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{v.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'rfqs' && (
                <div className="max-w-2xl bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Create RFQ's Node</h1>
                  <form onSubmit={handleCreateRfq} className="space-y-4 text-xs">
                    <div><label className="block font-bold text-gray-500 mb-1">RFQ Title Scope*</label><input required type="text" placeholder="e.g., Office Furniture Procurement" value={newRfq.title} onChange={e => setNewRfq({...newRfq, title: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500 font-medium" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-bold text-gray-500 mb-1">Category Core</label><input type="text" placeholder="Category" value={newRfq.category} onChange={e => setNewRfq({...newRfq, category: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500" /></div>
                      <div><label className="block font-bold text-gray-500 mb-1">Target Response Deadline*</label><input required type="text" placeholder="e.g. 15 June 2026" value={newRfq.deadline} onChange={e => setNewRfq({...newRfq, deadline: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500 font-medium" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block font-bold text-gray-500 mb-1">Item Label</label><input type="text" placeholder="Item Name" value={newRfq.item} onChange={e => setNewRfq({...newRfq, item: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500" /></div>
                      <div><label className="block font-bold text-gray-500 mb-1">Quantity</label><input type="number" placeholder="25" value={newRfq.qty} onChange={e => setNewRfq({...newRfq, qty: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500" /></div>
                      <div><label className="block font-bold text-gray-500 mb-1">Unit Target Cost (₹)</label><input type="number" placeholder="3500" value={newRfq.price} onChange={e => setNewRfq({...newRfq, price: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500 font-medium" /></div>
                    </div>
                    <div><label className="block font-bold text-gray-500 mb-1">Technical Specifications Details</label><textarea rows="3" placeholder="Specify compliance frameworks..." value={newRfq.description} onChange={e => setNewRfq({...newRfq, description: e.target.value})} className="w-full border rounded-xl p-3 focus:outline-emerald-500 font-medium"></textarea></div>
                    <button type="submit" className="bg-emerald-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-md tracking-wide">Save & Send to Vendors</button>
                  </form>
                </div>
              )}

              {currentView === 'quotations' && (
                <div className="space-y-4">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Quotations Comparison Panel</h1>
                  {quotations.length === 0 ? (
                    <p className="text-xs text-gray-400 p-5 bg-white border rounded-2xl text-center shadow-sm font-medium">No incoming bids mapped inside transaction buffers. Build an RFQ configuration block matrix first.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {quotations.map((q, idx) => (
                        <div key={idx} className="border-2 border-emerald-500 bg-emerald-50/10 rounded-2xl p-6 shadow-md flex flex-col justify-between">
                          <div>
                            <span className="bg-emerald-600 text-white font-bold text-[9px] uppercase px-2.5 py-1 rounded-md tracking-wider shadow-sm">★★ Automated Lowest Valuation Candidate ★★</span>
                            <h3 className="font-extrabold text-base mt-3 mb-4 text-slate-800">Dynamic Bidder Evaluation Frame</h3>
                            <div className="text-xs space-y-2 font-semibold">
                              <p className="text-gray-400 flex justify-between">Calculated Grand Base Total: <span className="font-bold text-gray-900 font-mono">₹ {q.grandTotal.toLocaleString()}</span></p>
                              <p className="text-gray-400 flex justify-between">Fulfillment Delivery: <span className="text-gray-800 font-medium">{q.delivery} business days</span></p>
                              <p className="text-gray-500 flex justify-between">System Performance Index: <span className="text-emerald-700 font-black">{q.rating}</span></p>
                            </div>
                          </div>
                          <button onClick={() => {
                              void handleStartApprovalWorkflow();
                          }} className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl text-xs font-black shadow-md tracking-wider">Select & Initiate Approval Workflow</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentView === 'approvals' && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-3xl space-y-6">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Approval Verification Sign-off</h1>
                  <div className="flex justify-between border-b border-gray-100 pb-4 text-[11px] font-bold tracking-tight text-gray-400">
                    <span className="text-emerald-600 font-black">1. Node Dispatched</span><span>➔</span><span className="text-emerald-600 font-black">2. Verification Audit</span><span>➔</span><span className="text-emerald-800 font-black underline decoration-2 underline-offset-4">3. Exec Approval</span><span>➔</span><span>4. Print PO Document</span>
                  </div>
                  {rfqs.length === 0 ? (
                    <p className="text-xs text-center py-4 font-semibold text-gray-400">No validation target active inside cache frames.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl border text-xs font-semibold space-y-1.5">
                        <p className="text-gray-400">Target Object Scope: <span className="text-gray-900 font-bold">{rfqs[0].title}</span></p>
                        <p className="text-gray-400">Operational Base Cost Value: <span className="text-emerald-800 font-extrabold">₹ {(rfqs[0].qty * rfqs[0].price).toLocaleString()}</span></p>
                      </div>
                      <div className="flex space-x-3 pt-2">
                        <button onClick={() => {
                            void handleResolveApproval('approved');
                        }} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md tracking-wide">Sign-off & Approve</button>
                        <button onClick={() => {
                            void handleResolveApproval('rejected');
                        }} className="border border-slate-200 text-gray-500 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50">Reject Loop</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentView === 'invoices' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center print:hidden">
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Purchase Order & Invoice Vault</h1>
                    <button onClick={() => window.print()} className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-5 py-2 text-xs rounded-xl shadow-md">Print / Download PDF</button>
                  </div>
                  {rfqs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-10 bg-white border rounded-2xl shadow-sm">No immutable invoice files found inside system cache records.</p>
                  ) : (
                    <div className="bg-white border border-gray-300 p-10 max-w-2xl mx-auto shadow-lg space-y-6 text-xs text-gray-800 print:shadow-none print:border-none print:my-0">
                      <div className="flex justify-between border-b-2 border-gray-100 pb-4"><h2 className="text-base font-extrabold text-emerald-800 tracking-tight">VENDORBRIDGE ENTERPRISE</h2><p className="font-mono font-bold text-gray-900 text-sm">PO-2026-0068</p></div>
                      <div className="grid grid-cols-2 gap-4 text-[11px] border-b border-gray-100 pb-4">
                        <div><p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Entity Matrix</p><p className="font-extrabold text-gray-900">Internal Accounts Department</p><p className="text-gray-400 font-mono text-[10px] mt-0.5">GSTIN: 253834384AFB</p></div>
                        <div><p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Supplier Profile Partner</p><p className="font-extrabold text-gray-900">Dynamic Registered Bidder Node</p><p className="text-gray-400 font-mono text-[10px] mt-0.5">GSTIN: 343434DB4523</p></div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Itemized Fulfillment Line Items</p>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 font-semibold text-slate-900">
                          <span>{rfqs[0].item || 'Unspecified Asset'}</span>
                          <span className="font-mono text-slate-500 text-[11px]">Qty: {rfqs[0].qty} @ ₹ {rfqs[0].price.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-4 text-right space-y-1.5 text-xs border-t border-dashed border-gray-200">
                        <p className="text-gray-400">Calculated Subtotal base: <span className="font-mono text-gray-900 font-semibold ml-2">₹ {activeSubtotal.toLocaleString()}</span></p>
                        <p className="text-gray-400">Central CGST (9%): <span className="font-mono text-gray-900 ml-2">₹ {calculatedCgst.toLocaleString()}</span></p>
                        <p className="text-gray-400">State SGST (9%): <span className="font-mono text-gray-900 ml-2">₹ {calculatedSgst.toLocaleString()}</span></p>
                        <div className="border-t border-slate-200 pt-2 font-black text-base text-emerald-800">Grand Total Billing Sum: ₹ {completeGrandTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentView === 'reports' && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
                  <h1 className="text-xl font-bold">Reports & High-level Analytics</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="p-4 bg-gray-50 border rounded-xl shadow-sm"><p className="text-gray-400 uppercase tracking-wider text-[10px]">Total Ecosystem Spend</p><p className="text-2xl font-black text-emerald-800 mt-1 font-mono">₹ {completeGrandTotal.toLocaleString()}</p></div>
                    <div className="p-4 bg-gray-50 border rounded-xl shadow-sm"><p className="text-gray-400 uppercase tracking-wider text-[10px]">Onboarded Active Vendors</p><p className="text-2xl font-black text-slate-800 mt-1">{vendors.length} Registers</p></div>
                  </div>
                </div>
              )}

              {currentView === 'activity' && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-xl space-y-4">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Immutable System Activity Audit Trail</h1>
                  <div className="space-y-4 text-xs border-l-2 pl-5 border-emerald-600 relative">
                    {logs.map((log, i) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-6.25 top-0.5 bg-emerald-700 w-2 h-2 rounded-full border border-white"></div>
                        <p className="font-bold text-gray-800 group-hover:text-emerald-900 transition-colors">{log.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{log.time} • Mapped Class: {log.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'vendor-request' && (
                <div className="max-w-xl bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Vendor Request / Clarification Console Center</h1>
                  <p className="text-xs text-gray-400 font-medium">Submit an operational clarification or query directly to the active desk officer.</p>
                  <form onSubmit={handleVendorRequestSubmit} className="space-y-3.5 text-xs">
                    <textarea required rows="4" value={vendorQuery} onChange={e => setVendorQuery(e.target.value)} placeholder="Type your formal clarification or assistance request here..." className="w-full border rounded-xl p-3 focus:outline-emerald-500 font-medium leading-normal shadow-inner"></textarea>
                    <button type="submit" className="bg-emerald-600 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md tracking-wide">Put Request to Officer</button>
                  </form>

                  {vendorRequests.length > 0 && (
                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispatched Queries Monitoring</h4>
                      {vendorRequests.map((r, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border rounded-xl text-xs font-semibold shadow-sm">
                          <p className="text-gray-700 leading-normal font-medium">{r.text}</p>
                          <p className="text-[9px] text-amber-700 font-black mt-2 bg-amber-50 border border-amber-100 inline-block px-2 py-0.5 rounded-md">Submitted by {r.vendor} ➔ Forwarded to Desk Officer Queue</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </main>
          </div>
        </div>
      )}
    </div>
  );
}