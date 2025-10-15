    // Multi-frame capture for registration
    const captureMultiplePhotos = async (numPhotos = 7, intervalMs = 400) => {
        let photos = [];
        for (let i = 0; i < numPhotos; i++) {
            const photo = capturePhoto();
            if (photo) photos.push(photo);
            await new Promise(res => setTimeout(res, intervalMs));
        }
        return photos;
    };

    // Registration handler using multiple photos
    const handleRegisterUser = async () => {
        if (!isCameraActive) {
            toast({ title: "Camera not active", description: "Start the camera first.", variant: "destructive" });
            return;
        }
        setRecognitionStatus('Capturing multiple photos...');
        const photos = await captureMultiplePhotos();
        setRecognitionStatus('Registering user...');
        // Send all photos to backend for registration
        const response = await fetch(`${API_BASE}/gate-entry/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userForm.name,
                phone: userForm.phone,
                photos: photos // backend should accept array
            })
        });
        const result = await response.json();
        stopCamera();
        setRecognitionStatus('System Ready');
        if (result.success) {
            toast({ title: "User Registered", description: `User ${userForm.name} registered successfully!` });
            // Stop and restart camera for recognition
            stopCamera();
            setTimeout(() => {
                // Ensure video element and stream are fully reset
                if (videoRef.current) videoRef.current.srcObject = null;
                if (streamRef.current) streamRef.current = null;
                startCamera();
                setRecognitionStatus('System Ready');
            }, 2000);
        } else {
            toast({ title: "Registration Failed", description: result.message, variant: "destructive" });
        }
    };
    // Start continuous recognition loop
    const startRecognitionLoop = () => {
        if (recognitionIntervalRef.current) return;
        recognitionIntervalRef.current = setInterval(() => {
            performFaceRecognition();
        }, 1000); // every second
        setIsRecognitionActive(true);
        setRecognitionStatus('Recognition active');
    };

    // Stop recognition loop
    const stopRecognitionLoop = () => {
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
        }
        setIsRecognitionActive(false);
        setRecognitionStatus('Recognition stopped');
    };

    // UI controls to start/stop recognition
    // ...existing code...
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Car,
    Search,
    AlertTriangle,
    FileText,
    BarChart3,
    RefreshCw,
    ArrowLeft,
    Users,
    Camera,
    CameraOff,
    LogIn,
    LogOut,
    Download
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

const GateEntryTab = () => {
    // Gate Entry states
    const [gateEntryUsers, setGateEntryUsers] = useState([]);
    const [gateEntryLogs, setGateEntryLogs] = useState([]);
    const [goingOutLogs, setGoingOutLogs] = useState([]);
    const [todaySummary, setTodaySummary] = useState(null);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const [recognitionStatus, setRecognitionStatus] = useState('System Ready');
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showGoingOutDialog, setShowGoingOutDialog] = useState(false);
    const [showLogsDialog, setShowLogsDialog] = useState(false);
    const [showGoingOutLogsDialog, setShowGoingOutLogsDialog] = useState(false);
    const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
    const [showManualExitDialog, setShowManualExitDialog] = useState(false);
    const [userForm, setUserForm] = useState({
        name: '',
        phone: '',
        photo: null
    });
    const [goingOutForm, setGoingOutForm] = useState({
        reason: 'Office Work',
        details: ''
    });
    const [manualEntryForm, setManualEntryForm] = useState({
        phone: '',
        details: ''
    });
    const [manualExitForm, setManualExitForm] = useState({
        phone: '',
        details: ''
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const { toast } = useToast();

    // Camera states
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [recognitionAction, setRecognitionAction] = useState('entry'); // 'entry' or 'exit'
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastRecognitionTimes, setLastRecognitionTimes] = useState({}); // Track last recognition per user
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const recognitionIntervalRef = useRef(null);
    const audioContextRef = useRef(null);

    // Load initial data
    useEffect(() => {
        loadUsers();
        loadLogs();
        loadTodaySummary();
        
        // Refresh data every 30 seconds
        const interval = setInterval(() => {
            loadLogs();
            loadTodaySummary();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopRecognitionLoop();
            stopCamera();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Play beep sound on recognition
    const playBeepSound = async () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const context = audioContextRef.current;

            // Resume context if suspended (required by some browsers)
            if (context.state === 'suspended') {
                await context.resume();
            }

            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.frequency.setValueAtTime(800, context.currentTime); // 800 Hz beep
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } catch (error) {
            console.error('Error playing beep sound:', error);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await fetch(`${API_BASE}/gate-entry/users`);
            if (response.ok) {
                const users = await response.json();
                setGateEntryUsers(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadLogs = async () => {
        try {
            const [logsRes, goingOutRes] = await Promise.all([
                fetch(`${API_BASE}/gate-entry/logs?limit=50`),
                fetch(`${API_BASE}/gate-entry/going-out-logs?limit=50`)
            ]);

            if (logsRes.ok) {
                const logs = await logsRes.json();
                setGateEntryLogs(logs);
            }

            if (goingOutRes.ok) {
                const goingOutLogs = await goingOutRes.json();
                setGoingOutLogs(goingOutLogs);
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };

    const loadTodaySummary = async () => {
        try {
            const response = await fetch(`${API_BASE}/gate-entry/today-logs`);
            if (response.ok) {
                const summary = await response.json();
                setTodaySummary(summary);
            }
        } catch (error) {
            console.error('Error loading today summary:', error);
        }
    };

    // Camera functions
    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;

                // Wait for video to be ready and play it
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play().then(() => {
                            resolve();
                        }).catch(err => {
                            console.error('Error playing video:', err);
                            resolve(); // Resolve anyway to not block
                        });
                    };
                });

                setIsCameraActive(true);
                toast({
                    title: "Camera Started",
                    description: "Camera feed is now active",
                });
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            let errorMessage = 'Failed to access camera. Please check permissions.';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. Please allow camera permissions.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is already in use by another application.';
            }

            setCameraError(errorMessage);
            toast({
                title: "Camera Error",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setCameraError(null);
    };

    // Capture photo from video feed
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) {
            return null;
        }
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video.readyState !== 4) { // HAVE_ENOUGH_DATA
            return null;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        setCapturedPhoto(photoDataUrl);
        
        return photoDataUrl;
    };

    // Perform face recognition
    const performFaceRecognition = async () => {
        if (isProcessing) {
            return; // Skip if already processing
        }

        try {
            setIsProcessing(true);
            const photo = capturePhoto();
            
            if (!photo) {
                return; // Camera not ready yet
            }

            setRecognitionStatus('Scanning for faces...');

            const response = await fetch(`${API_BASE}/gate-entry/recognize-face`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photo: photo,
                    action: recognitionAction
                }),
            });

            const result = await response.json();

            if (result.recognized) {
                const userId = result.user.id;
                const now = Date.now();
                const lastTime = lastRecognitionTimes[userId] || 0;
                const cooldownMs = 30000; // 30 seconds cooldown per user

                if (now - lastTime < cooldownMs) {
                    // Still in cooldown for this user
                    const remaining = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
                    setRecognitionStatus(`Cooldown active for ${result.user.name} - ${remaining}s remaining`);
                    return;
                }

                // Update last recognition time for this user
                setLastRecognitionTimes(prev => ({ ...prev, [userId]: now }));

                if (result.success) {
                    // Face recognized and entry/exit successful
                    setRecognitionStatus(`Recognized: ${result.user.name} - ${recognitionAction === 'entry' ? 'Entry' : 'Exit'} Recorded`);

                    // Play beep sound
                    await playBeepSound();

                    toast({
                        title: "Face Recognized!",
                        description: `${result.user.name} - ${recognitionAction === 'entry' ? 'Entry' : 'Exit'} recorded (${result.confidence}% confidence)`,
                        duration: 3000,
                    });

                    // Refresh logs and summary
                    loadLogs();
                    loadTodaySummary();

                    // Brief status update, then continue scanning
                    setTimeout(() => {
                        setRecognitionStatus('Recognition Active - Scanning...');
                    }, 2000);
                } else {
                    // Face recognized but entry/exit blocked
                    const actionText = recognitionAction === 'entry' ? 'Entry' : 'Exit';
                    setRecognitionStatus(`${actionText} Blocked: ${result.message}`);

                    toast({
                        title: `${actionText} Blocked`,
                        description: result.message,
                        variant: "destructive",
                        duration: 5000,
                    });

                    // Brief status update, then continue scanning
                    setTimeout(() => {
                        setRecognitionStatus('Recognition Active - Scanning...');
                    }, 3000);
                }

            } else {
                // No face recognized
                setRecognitionStatus('No face detected - Keep scanning...');
            }

        } catch (error) {
            console.error('Error during face recognition:', error);
            setRecognitionStatus('Recognition Active - Scanning...');
        } finally {
            setIsProcessing(false);
        }
    };

    // Start recognition loop
    const startRecognitionLoop = () => {
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
        }
        
        // Perform recognition every 2 seconds
        recognitionIntervalRef.current = setInterval(() => {
            performFaceRecognition();
        }, 2000);
    };

    // Stop recognition loop
    const stopRecognitionLoop = () => {
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
        }
    };

    // Gate Entry Handlers
    const handleStartRecognition = async () => {
        await startCamera();
        if (streamRef.current) {  // Check if camera started successfully
            setIsRecognitionActive(true);
            setRecognitionStatus('Recognition Active - Scanning...');
            startRecognitionLoop();
            toast({
                title: "Recognition Started",
                description: "Face recognition system is now active",
            });
        } else {
            toast({
                title: "Recognition Failed",
                description: "Failed to start camera for recognition",
                variant: "destructive"
            });
        }
    };

    const handleStopRecognition = () => {
        stopRecognitionLoop();
        stopCamera();
        setIsRecognitionActive(false);
        setRecognitionStatus('System Ready');
        toast({
            title: "Recognition Stopped",
            description: "Face recognition system has been stopped",
        });
    };

    const handleManualEntry = () => {
        setShowManualEntryDialog(true);
    };

    const handleManualExit = () => {
        setShowManualExitDialog(true);
    };

    const handleEmergencyOverride = () => {
        toast({
            title: "Emergency Override",
            description: "Emergency override activated - all security checks bypassed",
            variant: "destructive"
        });
    };

    const handleGoingOut = () => {
        if (!selectedUser) {
            toast({
                title: "Error",
                description: "Please select a user first",
                variant: "destructive"
            });
            return;
        }
        setShowGoingOutDialog(true);
    };

    const handleComingBack = async () => {
        if (!selectedUser) {
            toast({
                title: "Error",
                description: "Please select a user first",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/gate-entry/coming-back`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: selectedUser.phone
                }),
            });

            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: "Coming Back Recorded",
                    description: result.message,
                });
                loadLogs();
                loadTodaySummary();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to record coming back",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error recording coming back:', error);
            toast({
                title: "Error",
                description: "Failed to record coming back",
                variant: "destructive"
            });
        }
    };

    const handleRegisterUser = async () => {
        setUserForm({ name: '', phone: '', photo: null });
        setCapturedPhoto(null);
        setShowUserDialog(true);
    };

    const handleViewUsers = () => {
        toast({
            title: "Users Loaded",
            description: `Found ${gateEntryUsers.length} registered users`,
        });
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) {
            toast({
                title: "Error",
                description: "Please select a user to delete",
                variant: "destructive"
            });
            return;
        }

        if (window.confirm(`Are you sure you want to delete user ${selectedUser.name}?`)) {
            try {
                const response = await fetch(`${API_BASE}/gate-entry/users/${selectedUser.phone}`, {
                    method: 'DELETE',
                });

                const result = await response.json();
                
                if (response.ok) {
                    toast({
                        title: "User Deleted",
                        description: `${selectedUser.name} has been removed from the system`,
                    });
                    setSelectedUser(null);
                    loadUsers();
                } else {
                    toast({
                        title: "Error",
                        description: result.message || "Failed to delete user",
                        variant: "destructive"
                    });
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                toast({
                    title: "Error",
                    description: "Failed to delete user",
                    variant: "destructive"
                });
            }
        }
    };

    const handleGateLogs = () => {
        setShowLogsDialog(true);
    };

    const handleGoingOutLogs = () => {
        setShowGoingOutLogsDialog(true);
    };

    const handleRegisterUserSubmit = async () => {
        if (!userForm.name.trim() || !userForm.phone.trim()) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/gate-entry/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: userForm.name,
                    phone: userForm.phone,
                    photo: capturedPhoto
                }),
            });

            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: "User Registered",
                    description: result.message,
                });
                setShowUserDialog(false);
                setUserForm({ name: '', phone: '', photo: null });
                setCapturedPhoto(null);
                stopCamera();
                loadUsers();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to register user",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error registering user:', error);
            toast({
                title: "Error",
                description: `Registration failed: ${error.message || error}`,
                variant: "destructive"
            });
        }
    };

    const handleGoingOutSubmit = async () => {
        if (!selectedUser) {
            toast({
                title: "Error",
                description: "Please select a user",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/gate-entry/going-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: selectedUser.phone,
                    reason_type: goingOutForm.reason,
                    reason_details: goingOutForm.details
                }),
            });

            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: "Going Out Recorded",
                    description: result.message,
                });
                setShowGoingOutDialog(false);
                setGoingOutForm({ reason: 'Office Work', details: '' });
                loadLogs();
                loadTodaySummary();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to record going out",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error recording going out:', error);
            toast({
                title: "Error",
                description: "Failed to record going out",
                variant: "destructive"
            });
        }
    };

    const handleManualEntrySubmit = async () => {
        if (!manualEntryForm.phone.trim()) {
            toast({
                title: "Error",
                description: "Phone number is required",
                variant: "destructive"
            });
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/gate-entry/manual-entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: manualEntryForm.phone,
                    details: manualEntryForm.details
                }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                setShowManualEntryDialog(false);
                setManualEntryForm({ phone: '', details: '' });
                loadLogs();
                loadTodaySummary();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to record manual entry",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error recording manual entry:', error);
            toast({
                title: "Error",
                description: "Failed to record manual entry",
                variant: "destructive"
            });
        }
    };

    const handleManualExitSubmit = async () => {
        if (!manualExitForm.phone.trim()) {
            toast({
                title: "Error",
                description: "Phone number is required",
                variant: "destructive"
            });
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/gate-entry/manual-exit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: manualExitForm.phone,
                    details: manualExitForm.details
                }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                setShowManualExitDialog(false);
                setManualExitForm({ phone: '', details: '' });
                loadLogs();
                loadTodaySummary();
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to record manual exit",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error recording manual exit:', error);
            toast({
                title: "Error",
                description: "Failed to record manual exit",
                variant: "destructive"
            });
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const handleDownloadLogs = async (logType = 'all') => {
        try {
            toast({
                title: "Downloading...",
                description: "Preparing Excel file for download",
            });

            const response = await fetch(`${API_BASE}/gate-entry/export-logs?type=${logType}`);
            
            if (!response.ok) {
                throw new Error('Failed to download logs');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gate_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Download Complete",
                description: "Gate logs have been downloaded successfully",
            });
        } catch (error) {
            console.error('Error downloading logs:', error);
            toast({
                title: "Download Failed",
                description: "Failed to download gate logs",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Today's Summary Cards */}
            {todaySummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600">Total Entries</p>
                                    <p className="text-3xl font-bold text-green-700">{todaySummary.total_entries || 0}</p>
                                </div>
                                <LogIn className="h-10 w-10 text-green-600 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-600">Total Exits</p>
                                    <p className="text-3xl font-bold text-orange-700">{todaySummary.total_exits || 0}</p>
                                </div>
                                <LogOut className="h-10 w-10 text-orange-600 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Currently Inside</p>
                                    <p className="text-3xl font-bold text-blue-700">{todaySummary.currently_inside || 0}</p>
                                </div>
                                <Users className="h-10 w-10 text-blue-600 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600">Currently Out</p>
                                    <p className="text-3xl font-bold text-purple-700">{todaySummary.currently_out || 0}</p>
                                </div>
                                <Clock className="h-10 w-10 text-purple-600 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Panel - Camera and Recognition */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Shield className="h-5 w-5" />
                                Live Camera Feed
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Camera for face recognition and manual verification
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4 relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    style={{ display: isCameraActive ? 'block' : 'none' }}
                                />
                                {!isCameraActive && (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-100">
                                        <div className="text-center">
                                            <Camera className="w-16 h-16 mx-auto mb-2" />
                                            <p className="text-lg font-medium">Camera Off</p>
                                            <p className="text-sm">Click "Start Recognition" to begin</p>
                                            {cameraError && (
                                                <p className="text-red-500 text-xs mt-2 max-w-xs">{cameraError}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Action Selector */}
                            <div className="mb-4">
                                <Label className="text-gray-700 mb-2 block">Recognition Action</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={recognitionAction === 'entry' ? 'default' : 'outline'}
                                        className={`flex-1 ${recognitionAction === 'entry' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                        onClick={() => setRecognitionAction('entry')}
                                        disabled={isRecognitionActive}
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Entry
                                    </Button>
                                    <Button
                                        variant={recognitionAction === 'exit' ? 'default' : 'outline'}
                                        className={`flex-1 ${recognitionAction === 'exit' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                        onClick={() => setRecognitionAction('exit')}
                                        disabled={isRecognitionActive}
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Exit
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={handleStartRecognition}
                                    disabled={isRecognitionActive}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Start Recognition
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleStopRecognition}
                                    disabled={!isRecognitionActive}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Stop Recognition
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recognition Status */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="text-center py-8">
                                <div className="text-2xl font-bold text-gray-800 mb-2">{recognitionStatus}</div>
                                <div className="text-gray-600">
                                    {isRecognitionActive ? 'Face recognition is active...' : 'Waiting for recognition to start...'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users List */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gray-800">Registered Users ({gateEntryUsers.length})</CardTitle>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={loadUsers}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {gateEntryUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedUser?.id === user.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-gray-800">{user.name}</div>
                                                <div className="text-sm text-gray-600">{user.phone}</div>
                                            </div>
                                            <Badge className={`${
                                                user.status === 'active' 
                                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                                    : 'bg-gray-100 text-gray-800 border-gray-300'
                                            }`}>
                                                {user.status || 'Active'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {gateEntryUsers.length === 0 && (
                                    <p className="text-gray-600 text-center py-4">No users registered yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel - Controls */}
                <div className="space-y-4">
                    {/* Manual Entry/Exit */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-gray-800">Manual Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleManualEntry}
                            >
                                <User className="h-4 w-4 mr-2" />
                                Manual Entry
                            </Button>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700"
                                onClick={handleManualExit}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Manual Exit
                            </Button>
                            <Button
                                className="w-full bg-red-600 hover:bg-red-700"
                                onClick={handleEmergencyOverride}
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Emergency Override
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Going Out Controls */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-gray-800">Going Out</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleGoingOut}
                                disabled={!selectedUser}
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Going Out
                            </Button>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleComingBack}
                                disabled={!selectedUser}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Coming Back
                            </Button>
                        </CardContent>
                    </Card>

                    {/* User Management */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-gray-800">User Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={handleRegisterUser}
                            >
                                <User className="h-4 w-4 mr-2" />
                                Register User
                            </Button>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleViewUsers}
                            >
                                <Users className="h-4 w-4 mr-2" />
                                View Users
                            </Button>
                            <Button
                                className="w-full bg-red-600 hover:bg-red-700"
                                onClick={handleDeleteUser}
                                disabled={!selectedUser}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Delete User
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Logs */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-gray-800">Reports & Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full bg-yellow-600 hover:bg-yellow-700"
                                onClick={handleGateLogs}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Gate Logs
                            </Button>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700"
                                onClick={handleGoingOutLogs}
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Going Out Logs
                            </Button>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => handleDownloadLogs('all')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download All Logs
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* User Registration Dialog */}
            <Dialog open={showUserDialog} onOpenChange={(open) => {
                setShowUserDialog(open);
                if (!open) {
                    stopCamera();
                    setCapturedPhoto(null);
                }
            }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-green-600" />
                            Register New User
                        </DialogTitle>
                        <DialogDescription>
                            Add a new user to the gate entry system. Capture a photo for identification.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="userName">Full Name *</Label>
                            <Input
                                id="userName"
                                value={userForm.name}
                                onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="userPhone">Phone Number *</Label>
                            <Input
                                id="userPhone"
                                type="tel"
                                value={userForm.phone}
                                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Photo</Label>
                            {capturedPhoto ? (
                                <div className="relative">
                                    <img 
                                        src={capturedPhoto} 
                                        alt="Captured" 
                                        className="w-full rounded-lg border-2 border-green-500"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="absolute top-2 right-2"
                                        onClick={() => setCapturedPhoto(null)}
                                    >
                                        Retake
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                            style={{ display: isCameraActive ? 'block' : 'none' }}
                                        />
                                        {!isCameraActive && (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-100">
                                                <div className="text-center">
                                                    <CameraOff className="w-12 h-12 mx-auto mb-2" />
                                                    <p className="text-sm">Camera Off</p>
                                                    <p className="text-xs text-gray-400 mt-1">Click "Start Camera" below</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {!isCameraActive ? (
                                            <Button
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                onClick={startCamera}
                                            >
                                                <Camera className="h-4 w-4 mr-2" />
                                                Start Camera
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                    onClick={capturePhoto}
                                                >
                                                    <Camera className="h-4 w-4 mr-2" />
                                                    Capture Photo
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={stopCamera}
                                                >
                                                    Stop
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowUserDialog(false);
                            stopCamera();
                            setCapturedPhoto(null);
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRegisterUserSubmit}
                            disabled={!userForm.name.trim() || !userForm.phone.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <User className="h-4 w-4 mr-1" />
                            Register User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Going Out Dialog */}
            <Dialog open={showGoingOutDialog} onOpenChange={setShowGoingOutDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Going Out
                        </DialogTitle>
                        <DialogDescription>
                            Record going out activity for {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Select
                                value={goingOutForm.reason}
                                onValueChange={(value) => setGoingOutForm(prev => ({ ...prev, reason: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Office Work">Office Work</SelectItem>
                                    <SelectItem value="Personal Work">Personal Work</SelectItem>
                                    <SelectItem value="Lunch">Lunch</SelectItem>
                                    <SelectItem value="Medical">Medical</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="details">Details</Label>
                            <Input
                                id="details"
                                value={goingOutForm.details}
                                onChange={(e) => setGoingOutForm(prev => ({ ...prev, details: e.target.value }))}
                                placeholder="Additional details (optional)"
                            />
                        </div>

                        {selectedUser && (
                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-sm">
                                <div><strong>User:</strong> {selectedUser.name}</div>
                                <div><strong>Phone:</strong> {selectedUser.phone}</div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGoingOutDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGoingOutSubmit}
                            disabled={!selectedUser}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Users className="h-4 w-4 mr-1" />
                            Record Going Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Gate Logs Dialog */}
            <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-yellow-600" />
                                Gate Entry Logs
                            </div>
                            <Button
                                onClick={() => handleDownloadLogs('entry')}
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download Excel
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            Recent gate entry and exit activities
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gateEntryLogs.length > 0 ? (
                                    gateEntryLogs.map((log, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{log.userName}</TableCell>
                                            <TableCell>{log.userPhone}</TableCell>
                                            <TableCell>
                                                <Badge className={log.action === 'entry' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">{log.method}</TableCell>
                                            <TableCell className="text-sm">{formatDateTime(log.timestamp)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500">
                                            No logs available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogsDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Going Out Logs Dialog */}
            <Dialog open={showGoingOutLogsDialog} onOpenChange={setShowGoingOutLogsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-orange-600" />
                                Going Out Logs
                            </div>
                            <Button
                                onClick={() => handleDownloadLogs('going_out')}
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download Excel
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            Recent going out and coming back activities
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Going Out</TableHead>
                                    <TableHead>Coming Back</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {goingOutLogs.length > 0 ? (
                                    goingOutLogs.map((log, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{log.userName}</TableCell>
                                            <TableCell>{log.userPhone}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.reasonType}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{formatDateTime(log.goingOutTime)}</TableCell>
                                            <TableCell className="text-sm">{formatDateTime(log.comingBackTime)}</TableCell>
                                            <TableCell className="text-sm">
                                                {log.durationMinutes ? `${Math.round(log.durationMinutes)} min` : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={log.status === 'out' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500">
                                            No logs available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGoingOutLogsDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Entry Dialog */}
            <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Manual Entry
                        </DialogTitle>
                        <DialogDescription>
                            Record manual gate entry for a user
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="manualEntryPhone">Phone Number *</Label>
                            <Input
                                id="manualEntryPhone"
                                type="tel"
                                value={manualEntryForm.phone}
                                onChange={(e) => setManualEntryForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manualEntryDetails">Details</Label>
                            <Input
                                id="manualEntryDetails"
                                value={manualEntryForm.details}
                                onChange={(e) => setManualEntryForm(prev => ({ ...prev, details: e.target.value }))}
                                placeholder="Enter details (optional)"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowManualEntryDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleManualEntrySubmit}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Record Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Exit Dialog */}
            <Dialog open={showManualExitDialog} onOpenChange={setShowManualExitDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeft className="h-5 w-5 text-orange-600" />
                            Manual Exit
                        </DialogTitle>
                        <DialogDescription>
                            Record manual gate exit for a user
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="manualExitPhone">Phone Number *</Label>
                            <Input
                                id="manualExitPhone"
                                type="tel"
                                value={manualExitForm.phone}
                                onChange={(e) => setManualExitForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manualExitDetails">Details</Label>
                            <Input
                                id="manualExitDetails"
                                value={manualExitForm.details}
                                onChange={(e) => setManualExitForm(prev => ({ ...prev, details: e.target.value }))}
                                placeholder="Enter details (optional)"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowManualExitDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleManualExitSubmit}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Record Exit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GateEntryTab;
