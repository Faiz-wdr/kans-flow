'use client';

import React, { useState, useTransition } from 'react';
import type { CompanyTimeline, UserRole } from '@/types';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { RoleBasedGuard } from '@/components/shared/shell/RoleBasedGuard';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/providers/dialog-provider';
import { Settings, Plus, Calendar, RotateCw } from 'lucide-react';
import { HorizontalTimeline } from './HorizontalTimeline';
import { VerticalTimeline } from './VerticalTimeline';

import { MilestoneModal } from './MilestoneModal';
import {
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
  fetchTimelineAction,
} from '@/app/(dashboard)/dashboard/settings/timeline-actions';

interface TimelineManagerProps {
  initialMilestones: CompanyTimeline[];
  userRole: UserRole | undefined;
}

export function TimelineManager({ initialMilestones, userRole }: TimelineManagerProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'timeline'>('system');
  const [milestones, setMilestones] = useState<CompanyTimeline[]>(initialMilestones);
  const [selectedMilestone, setSelectedMilestone] = useState<CompanyTimeline | null>(null);
  
  // Modal / Drawer open states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CompanyTimeline | null>(null);
  
  // Loading & Transition states
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { showAlert, showConfirm, showToast } = useDialog();

  // Refresh milestones list from database
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetchTimelineAction();
      if (res.success && res.data) {
        setMilestones(res.data);
        showToast('Timeline refreshed successfully.', 'success');
      } else {
        showAlert('Refresh Failed', res.error || 'Failed to fetch timeline milestones.');
      }
    } catch (err: any) {
      showAlert('Refresh Failed', err.message || 'An unexpected error occurred.');
    } finally {
      setRefreshing(false);
    }
  };

  // Open modal in Add mode
  const handleAddClick = () => {
    setEditingMilestone(null);
    setIsModalOpen(true);
  };

  // Open modal in Edit mode
  const handleEditClick = (milestone: CompanyTimeline) => {
    setEditingMilestone(milestone);
    setIsModalOpen(true);
  };

  // Handles save for Add / Edit operations
  const handleSaveMilestone = async (formData: {
    date: string;
    heading: string;
    description: string;
  }) => {
    setLoading(true);
    try {
      if (editingMilestone) {
        // Edit mode
        const res = await updateMilestoneAction(editingMilestone.id, formData);
        if (res.success) {
          showToast('Milestone updated successfully!', 'success');
          setIsModalOpen(false);
          setEditingMilestone(null);
          // If the detail drawer was showing the edited milestone, update it
          if (selectedMilestone?.id === editingMilestone.id) {
            setSelectedMilestone({
              ...selectedMilestone,
              ...formData,
              updatedAt: new Date().toISOString(),
            });
          }
          // Refresh list
          const listRes = await fetchTimelineAction();
          if (listRes.success && listRes.data) setMilestones(listRes.data);
        } else {
          showAlert('Update Failed', res.error || 'Could not update the milestone.');
        }
      } else {
        // Add mode
        const res = await createMilestoneAction(formData);
        if (res.success) {
          showToast('Milestone created successfully!', 'success');
          setIsModalOpen(false);
          // Refresh list
          const listRes = await fetchTimelineAction();
          if (listRes.success && listRes.data) setMilestones(listRes.data);
        } else {
          showAlert('Creation Failed', res.error || 'Could not save the new milestone.');
        }
      }
    } catch (err: any) {
      showAlert('Save Error', err.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  // Handles milestone deletion with confirmation dialog
  const handleDeleteMilestone = (id: string) => {
    showConfirm(
      'Delete Milestone',
      'Are you sure you want to permanently delete this milestone from the company timeline? This action cannot be undone.',
      async () => {
        setLoading(true);
        try {
          const res = await deleteMilestoneAction(id);
          if (res.success) {
            showToast('Milestone deleted successfully.', 'success');
            setSelectedMilestone(null); // Close detail drawer
            // Refresh list
            const listRes = await fetchTimelineAction();
            if (listRes.success && listRes.data) setMilestones(listRes.data);
          } else {
            showAlert('Delete Failed', res.error || 'Could not delete the milestone.');
          }
        } catch (err: any) {
          showAlert('Delete Error', err.message || 'An unexpected error occurred during deletion.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <PageContainer>
      <RoleBasedGuard allowedRoles={['admin']} userRole={userRole}>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-6 text-xs font-semibold uppercase tracking-wider overflow-x-auto whitespace-nowrap mb-6 font-sans select-none">
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'system'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            System Config
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'timeline'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Company Timeline
          </button>
        </div>

        {/* Tab Content 1: System Settings Dashboard */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <SectionHeader
              title="System Settings"
              description="Configure tenant branding, multi-tenant features, RLS tokens, and active metadata triggers."
            />
            <EmptyState
              title="Configuration Panel"
              description="Manage global organization variables, storage vaults, and notification triggers."
              icon={Settings}
            />
          </div>
        )}

        {/* Tab Content 2: Company Timeline Journey */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Action buttons layout (no titles or divider lines) */}
            <div className="flex justify-end gap-2 items-center select-none pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="h-8 text-xs inline-flex items-center gap-1.5 font-sans"
              >
                <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button
                onClick={handleAddClick}
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1.5 font-sans"
              >
                <Plus className="h-4 w-4" />
                <span>Add Milestone</span>
              </Button>
            </div>

            {/* Timelines View */}
            {milestones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <EmptyState
                  title="No Milestones Found"
                  description="Start visual storytelling by adding the first landmark milestone in the company journey."
                  icon={Calendar}
                />
                <Button
                  onClick={handleAddClick}
                  className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Milestone</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-6 font-sans">
                {/* Horizontal Timeline (Desktop) */}
                <div className="hidden md:block">
                  <HorizontalTimeline
                    milestones={milestones}
                    selectedMilestoneId={selectedMilestone?.id}
                    onMilestoneClick={setSelectedMilestone}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteMilestone}
                    loading={loading}
                  />
                </div>

                {/* Vertical Timeline (Mobile) */}
                <div className="block md:hidden">
                  <VerticalTimeline
                    milestones={milestones}
                    selectedMilestoneId={selectedMilestone?.id}
                    onMilestoneClick={setSelectedMilestone}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteMilestone}
                    loading={loading}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Milestone Detail Card renders inline below the timelines */}

        {/* Add/Edit Milestone Form Modal */}
        <MilestoneModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingMilestone(null);
          }}
          onSave={handleSaveMilestone}
          initialData={editingMilestone}
          loading={loading}
        />
      </RoleBasedGuard>
    </PageContainer>
  );
}
