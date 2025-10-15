import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { API_BASE_URL } from '../config/config';

// Import UI components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// Import icons
import { 
  CalendarIcon, 
  CheckCircle, 
  Clock, 
  Edit2, 
  MapPin, 
  MoreVertical,
  Plus, 
  Search,
  Trash2,
  User,
  Users 
} from 'lucide-react';

const Interview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // State management
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [interviewForm, setInterviewForm] = useState({
    applicationId: '',
    candidateName: '',
    jobTitle: '',
    scheduledDate: '',
    scheduledTime: '',
    interviewType: '',
    interviewers: '',
    interviewerId: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchInterviews();
  }, []);

  // Fetch interviews
  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/hr/interviews`);
      if (!response.ok) throw new Error('Failed to fetch interviews');
      const data = await response.json();
      setInterviews(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch interviews",
        variant: "destructive"
      });
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Schedule new interview
  const handleScheduleInterview = async () => {
    try {
      if (!interviewForm.applicationId || !interviewForm.interviewerId || !interviewForm.scheduledDate || 
          !interviewForm.scheduledTime || !interviewForm.interviewType) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/hr/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: Number(interviewForm.applicationId),
          interviewerId: Number(interviewForm.interviewerId),
          scheduledDate: interviewForm.scheduledDate,
          scheduledTime: interviewForm.scheduledTime,
          interviewType: interviewForm.interviewType,
          interviewers: interviewForm.interviewers,
          location: interviewForm.location,
          notes: interviewForm.notes,
          scheduledBy: user?.id || 1
        })
      });

      if (!response.ok) throw new Error('Failed to schedule interview');

      toast({
        title: "Success",
        description: "Interview scheduled successfully"
      });
      
      setShowModal(false);
      fetchInterviews();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Update interview status
  const handleUpdateStatus = async (interviewId, status, feedback = '', rating = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/interviews/${interviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback,
          rating,
          updatedBy: user?.id || 1
        })
      });

      if (!response.ok) throw new Error('Failed to update interview status');

      toast({
        title: "Success",
        description: "Interview status updated successfully"
      });
      
      fetchInterviews();
      setShowModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Delete interview
  const handleDeleteInterview = async (interviewId) => {
    if (!confirm('Are you sure you want to delete this interview?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/hr/interviews/${interviewId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete interview');

      toast({
        title: "Success",
        description: "Interview deleted successfully"
      });
      
      fetchInterviews();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setInterviewForm({
      applicationId: '',
      candidateName: '',
      jobTitle: '',
      scheduledDate: '',
      scheduledTime: '',
      interviewType: '',
      interviewers: '',
      interviewerId: '',
      location: '',
      notes: ''
    });
  };

  // Filter interviews based on search query and status
  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || interview.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interview Management</h1>
        <Button
          onClick={() => {
            setModalType('schedule');
            setShowModal(true);
            resetForm();
          }}
          className="bg-primary text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search interviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interviews List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInterviews.map((interview) => (
                <tr key={interview.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <User className="h-10 w-10 rounded-full bg-gray-100 p-2" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {interview.candidateName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{interview.jobTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {new Date(interview.scheduledDate).toLocaleDateString()}
                      </span>
                      <Clock className="h-4 w-4 ml-2 mr-1 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {interview.scheduledTime}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {interview.interviewType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${interview.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${interview.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      ${interview.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}`}>
                      {interview.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setModalType('view');
                          setShowModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setModalType('edit');
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(interview.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'schedule' && 'Schedule New Interview'}
              {modalType === 'view' && 'Interview Details'}
              {modalType === 'edit' && 'Edit Interview'}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'schedule' && 'Fill in the details to schedule a new interview'}
              {modalType === 'view' && 'View interview details and update status'}
              {modalType === 'edit' && 'Update interview details'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {(modalType === 'schedule' || modalType === 'edit') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="candidateName">Candidate Name *</Label>
                    <Input
                      id="candidateName"
                      value={interviewForm.candidateName}
                      onChange={(e) => setInterviewForm({ ...interviewForm, candidateName: e.target.value })}
                      placeholder="Enter candidate name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle">Position *</Label>
                    <Input
                      id="jobTitle"
                      value={interviewForm.jobTitle}
                      onChange={(e) => setInterviewForm({ ...interviewForm, jobTitle: e.target.value })}
                      placeholder="Enter job title"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledDate">Date *</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={interviewForm.scheduledDate}
                      onChange={(e) => setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduledTime">Time *</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={interviewForm.scheduledTime}
                      onChange={(e) => setInterviewForm({ ...interviewForm, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interviewType">Interview Type *</Label>
                    <Select
                      value={interviewForm.interviewType}
                      onValueChange={(value) => setInterviewForm({ ...interviewForm, interviewType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="cultural">Cultural Fit</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={interviewForm.location}
                      onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                      placeholder="Enter interview location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="interviewers">Interviewers</Label>
                  <Input
                    id="interviewers"
                    value={interviewForm.interviewers}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewers: e.target.value })}
                    placeholder="Enter interviewer names"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {modalType === 'view' && selectedInterview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Candidate Name</Label>
                    <p className="text-sm text-gray-900">{selectedInterview.candidateName}</p>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <p className="text-sm text-gray-900">{selectedInterview.jobTitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date & Time</Label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedInterview.scheduledDate).toLocaleDateString()} at {selectedInterview.scheduledTime}
                    </p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm text-gray-900">{selectedInterview.interviewType}</p>
                  </div>
                </div>

                <div>
                  <Label>Location</Label>
                  <p className="text-sm text-gray-900">{selectedInterview.location}</p>
                </div>

                <div>
                  <Label>Interviewers</Label>
                  <p className="text-sm text-gray-900">{selectedInterview.interviewers}</p>
                </div>

                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-gray-900">{selectedInterview.notes}</p>
                </div>

                <div>
                  <Label>Update Status</Label>
                  <Select
                    value={selectedInterview.status}
                    onValueChange={(value) => handleUpdateStatus(selectedInterview.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            {(modalType === 'schedule' || modalType === 'edit') && (
              <Button onClick={handleScheduleInterview}>
                {modalType === 'schedule' ? 'Schedule Interview' : 'Update Interview'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Interview;