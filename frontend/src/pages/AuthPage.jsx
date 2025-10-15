import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Lock, User, Building2, Mail, UserPlus } from 'lucide-react';


const AuthPage = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    department: ''
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [tabValue, setTabValue] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, users, register, forgotPassword } = useAuth();

  const departments = [
    { id: 'admin', name: 'Admin', icon: '👑' },
    { id: 'production', name: 'Production Planning', icon: '🏭' },
    { id: 'purchase', name: 'Purchase Department', icon: '🛒' },
    { id: 'store', name: 'Store Department', icon: '📦' },
    { id: 'assembly', name: 'Assembly Team', icon: '🔧' },
    { id: 'finance', name: 'Finance Department', icon: '💰' },
    { id: 'showroom', name: 'Showroom Department', icon: '🏪' },
    { id: 'sales', name: 'Sales Department', icon: '💼' },
    { id: 'dispatch', name: 'Dispatch Department', icon: '📋' },
    { id: 'watchman', name: 'Watchman Department', icon: '👁️' },
    { id: 'transport', name: 'Transport Department', icon: '🚛' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!credentials.username || !credentials.password) {
      toast({
        title: "Missing Information",
        description: "Please enter username and password.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the login function with credentials directly
      const response = await login(credentials);

      toast({
        title: "Login Successful!",
        description: `Welcome, ${response.user.username}!`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    }
  };



  const handleRegister = async (e) => {
    e.preventDefault();

    // Check if basic required fields are filled
    const basicFields = ['full_name', 'email', 'username', 'password'];
    const missingBasicFields = basicFields.filter(field => !registerData[field]);

    if (missingBasicFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingBasicFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Specifically validate department selection
    if (!registerData.department) {
      toast({
        title: "Department Required",
        description: "Please select a department for your account.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call register function from useAuth with the form data
      const response = await register(registerData);

      toast({
        title: "Registration Successful!",
        description: response.message || "Your account is pending approval from an administrator.",
      });

      // Reset form
      setRegisterData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        department: ''
      });
    } catch (error) {
      // Handle specific error cases
      if (error.message && error.message.includes("already exists")) {
        toast({
          title: "Username or Email Taken",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "An error occurred during registration.",
          variant: "destructive"
        });
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await forgotPassword(forgotEmail);

      toast({
        title: "Reset Email Sent",
        description: response.message || "If the email exists, a reset link has been sent.",
      });

      // Reset form
      setForgotEmail('');
    } catch (error) {
      toast({
        title: "Failed to Send Reset Email",
        description: error.message || "An error occurred while sending the reset email.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white border border-gray-300 shadow-lg">
          <div className="text-center p-8 border-b border-gray-200">
            <div className="w-16 h-16 bg-blue-700 rounded-sm flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Enterprise Resource Planning</h1>
            <p className="text-gray-600 text-sm">Official System Access Portal</p>
          </div>

          <div className="p-8">
            <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-gray-800">
                System Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-gray-800">
                Account Registration
              </TabsTrigger>
            </TabsList>

              <TabsContent value="login">
                {!showForgotPassword ? (
                  <>
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-700 font-medium">Username or Email</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <Input
                            id="username"
                            type="text"
                            value={credentials.username}
                            onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                            className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                            placeholder="Enter your username or email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <Input
                            id="password"
                            type="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                            className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                            placeholder="Enter your password"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-sm"
                      >
                        Access System
                      </Button>
                      <div className="text-right mt-2">
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </form>


                  </>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="forgot_email" className="text-gray-700 font-medium">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                          id="forgot_email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                          placeholder="Enter your email address"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-sm"
                    >
                      Send Reset Link
                    </Button>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Back to Login
                      </button>
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                      <h3 className="text-blue-800 font-medium mb-2">Password Reset Process:</h3>
                      <p className="text-sm text-blue-700">
                        Enter your email address and we'll send you a link to reset your password. The link will expire in 1 hour.
                      </p>
                    </div>
                  </form>
                )}

              {/* <div className="mt-8 p-4 bg-blue-500/20 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Demo Credentials:</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Admin:</strong> admin / admin123</p>
                  <p><strong>Production:</strong> prod_manager / prod123</p>
                  <p><strong>Sales:</strong> sales_rep / sales123</p>
                  <p><strong>Dispatch:</strong> dispatch_manager / dispatch123</p>
                  <p><strong>Watchman:</strong> watchman / watchman123</p>
                  <p><strong>Transport:</strong> transport_head / transport123</p>
                </div>
              </div> */}
            </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-700 font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <Input
                        id="full_name"
                        type="text"
                        value={registerData.full_name}
                        onChange={(e) => setRegisterData({...registerData, full_name: e.target.value})}
                        className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_username" className="text-gray-700 font-medium">Username</Label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <Input
                        id="reg_username"
                        type="text"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                        className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_password" className="text-gray-700 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <Input
                        id="reg_password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        className="pl-10 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                        placeholder="Choose a secure password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-gray-700 font-medium">Department Assignment</Label>
                    <Select
                      value={registerData.department}
                      onValueChange={(value) => setRegisterData({...registerData, department: value})}
                    >
                      <SelectTrigger className="w-full border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 border-gray-300">
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id} className="text-gray-900 hover:bg-gray-100">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Select the department you will be assigned to.</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-sm"
                  >
                    Submit Registration
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <h3 className="text-blue-800 font-medium mb-2">Registration Process:</h3>
                  <p className="text-sm text-blue-700">
                    Your registration request will be reviewed by system administrators. You will receive notification once your account is approved.
                  </p>
                </div>
              </TabsContent>


            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
