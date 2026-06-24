'use client';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState<any>(null);
  const [quizForm, setQuizForm] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', icon: '📚', usdPrice: 13, thumbnailUrl: '', isPublished: false, sortOrder: 0 });
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tab, setTab] = useState<'courses' | 'analytics'>('courses');

  const load = async () => {
    try { const data = await adminAPI.getCourses(); setCourses(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing?.id) { await adminAPI.updateCourse(editing.id, form); }
      else { await adminAPI.createCourse(form); }
      setEditing(null); setForm({ title: '', description: '', icon: '📚', usdPrice: 13, thumbnailUrl: '', isPublished: false, sortOrder: 0 });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course and all its lessons?')) return;
    await adminAPI.deleteCourse(id); load();
  };

  const handleAddLesson = async (courseId: string) => {
    if (!lessonForm?.title) return;
    await adminAPI.addLesson(courseId, lessonForm);
    setLessonForm(null); load();
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await adminAPI.deleteLesson(id); load();
  };

  const handleUpdateLesson = async (id: string, data: any) => {
    await adminAPI.updateLesson(id, data); load();
  };

  const handleCreateQuiz = async () => {
    if (!quizForm?.lessonId || !quizForm?.questions?.length) { alert('Add at least one question'); return; }
    try {
      await adminAPI.createQuiz(quizForm);
      setQuizForm(null); alert('Quiz created!');
    } catch (e: any) { alert(e.message); }
  };

  const loadAnalytics = async () => {
    try { const data = await adminAPI.getAcademyAnalytics(); setAnalytics(data); } catch {}
  };

  if (loading) return <div className="p-8 text-gray-400">Loading courses...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎓 Academy LMS</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('courses')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'courses' ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-600'}`}>Courses</button>
          <button onClick={() => { setTab('analytics'); loadAnalytics(); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'analytics' ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-600'}`}>Analytics</button>
          <button onClick={() => { setEditing({}); setForm({ title: '', description: '', icon: '📚', usdPrice: 13, thumbnailUrl: '', isPublished: false, sortOrder: 0 }); }}
            className="px-4 py-2 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium">+ Add Course</button>
        </div>
      </div>

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0F7B6C]">{analytics.totalEnrollments}</p>
                <p className="text-xs text-gray-500">Total Enrollments</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.completedEnrollments}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.completionRate}%</p>
                <p className="text-xs text-gray-500">Completion Rate</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{analytics.quizPassRate}%</p>
                <p className="text-xs text-gray-500">Quiz Pass Rate</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.totalCourses}</p>
                <p className="text-xs text-gray-500">Published Courses</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.totalLessons}</p>
                <p className="text-xs text-gray-500">Total Lessons</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{analytics.recentEnrollments}</p>
                <p className="text-xs text-gray-500">Last 30 Days</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.totalQuizAttempts}</p>
                <p className="text-xs text-gray-500">Quiz Attempts</p>
              </div>
            </div>
          ) : <p className="text-gray-400">Loading analytics...</p>}
        </div>
      )}

      {/* Courses Tab */}
      {tab === 'courses' && (
        <>
          {/* Course Form Modal */}
          {editing && (
            <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-4">{editing.id ? 'Edit Course' : 'New Course'}</h2>
              <div className="grid grid-cols-2 gap-4">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Course Title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Icon (emoji)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" value={form.usdPrice} onChange={e => setForm({ ...form, usdPrice: Number(e.target.value) })} placeholder="USD Price" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} placeholder="Sort Order" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} /> Published
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="px-4 py-2 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium">Save</button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {/* Quiz Builder Modal */}
          {quizForm && (
            <div className="mb-6 bg-white border border-purple-200 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-4">📝 Quiz Builder</h2>
              <div className="space-y-3 mb-4">
                <input value={quizForm.title || ''} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="Quiz Title" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-3">
                  <input type="number" value={quizForm.passingScore || 70} onChange={e => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Pass %" />
                  <input type="number" value={quizForm.maxAttempts || 3} onChange={e => setQuizForm({ ...quizForm, maxAttempts: Number(e.target.value) })} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Max attempts" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Questions:</h3>
              {(quizForm.questions || []).map((q: any, qi: number) => (
                <div key={qi} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <input value={q.questionText} onChange={e => { const qs = [...quizForm.questions]; qs[qi].questionText = e.target.value; setQuizForm({ ...quizForm, questions: qs }); }}
                    placeholder={`Question ${qi + 1}`} className="w-full border border-gray-200 rounded px-2 py-1 text-sm mb-2" />
                  {(q.options || []).map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center gap-2 mb-1">
                      <input type="radio" name={`q${qi}`} checked={q.correctOptionIndex === oi} onChange={() => { const qs = [...quizForm.questions]; qs[qi].correctOptionIndex = oi; setQuizForm({ ...quizForm, questions: qs }); }} />
                      <input value={opt} onChange={e => { const qs = [...quizForm.questions]; qs[qi].options[oi] = e.target.value; setQuizForm({ ...quizForm, questions: qs }); }}
                        placeholder={`Option ${oi + 1}`} className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" />
                    </div>
                  ))}
                  <button onClick={() => { const qs = [...quizForm.questions]; qs[qi].options.push(''); setQuizForm({ ...quizForm, questions: qs }); }}
                    className="text-[10px] text-blue-600 font-medium mt-1">+ Add Option</button>
                </div>
              ))}
              <button onClick={() => setQuizForm({ ...quizForm, questions: [...(quizForm.questions || []), { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }] })}
                className="text-xs text-purple-600 font-medium mb-4 block">+ Add Question</button>
              <div className="flex gap-2">
                <button onClick={handleCreateQuiz} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">Create Quiz</button>
                <button onClick={() => setQuizForm(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {/* Courses List */}
          <div className="space-y-4">
            {courses.map((course: any) => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{course.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{course.title}</h3>
                      <p className="text-xs text-gray-500">USD ${course.usdPrice} · {course.lessons?.length || 0} lessons · Order: {course.sortOrder}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <button onClick={() => { setEditing(course); setForm({ title: course.title, description: course.description, icon: course.icon, usdPrice: course.usdPrice, thumbnailUrl: course.thumbnailUrl || '', isPublished: course.isPublished, sortOrder: course.sortOrder }); }}
                      className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">Edit</button>
                    <button onClick={() => handleDelete(course.id)} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded font-medium">Delete</button>
                  </div>
                </div>

                {/* Lessons */}
                <div className="ml-8 space-y-2">
                  {course.lessons?.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((lesson: any, i: number) => (
                    <div key={lesson.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${lesson.type === 'video' ? 'bg-blue-100 text-blue-700' : lesson.type === 'text' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {lesson.type || 'video'}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{lesson.title}</span>
                      <span className="text-xs text-gray-400">{lesson.duration}</span>
                      <button onClick={() => setQuizForm({ lessonId: lesson.id, title: `${lesson.title} Quiz`, passingScore: 70, maxAttempts: 3, questions: [] })}
                        className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded">+ Quiz</button>
                      <button onClick={() => {
                        const url = prompt('Video URL:', lesson.videoUrl);
                        if (url !== null) handleUpdateLesson(lesson.id, { videoUrl: url });
                      }} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded">URL</button>
                      <button onClick={() => handleDeleteLesson(lesson.id)} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded">×</button>
                    </div>
                  ))}

                  {/* Add Lesson */}
                  {lessonForm?.courseId === course.id ? (
                    <div className="p-3 bg-yellow-50 rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <input value={lessonForm.title || ''} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Lesson title" className="flex-1 text-sm border border-gray-200 rounded px-2 py-1" />
                        <select value={lessonForm.type || 'video'} onChange={e => setLessonForm({ ...lessonForm, type: e.target.value })} className="text-sm border border-gray-200 rounded px-2 py-1">
                          <option value="video">🎬 Video</option>
                          <option value="text">📝 Text</option>
                          <option value="pdf">📄 PDF</option>
                        </select>
                        <input value={lessonForm.duration || ''} onChange={e => setLessonForm({ ...lessonForm, duration: e.target.value })} placeholder="Duration" className="w-20 text-sm border border-gray-200 rounded px-2 py-1" />
                      </div>
                      {lessonForm.type === 'video' && (
                        <input value={lessonForm.videoUrl || ''} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} placeholder="YouTube embed URL" className="w-full text-sm border border-gray-200 rounded px-2 py-1" />
                      )}
                      {lessonForm.type === 'text' && (
                        <textarea value={lessonForm.content || ''} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} placeholder="Lesson content (Markdown)" rows={4} className="w-full text-sm border border-gray-200 rounded px-2 py-1" />
                      )}
                      {lessonForm.type === 'pdf' && (
                        <input value={lessonForm.pdfUrl || ''} onChange={e => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })} placeholder="PDF URL (S3)" className="w-full text-sm border border-gray-200 rounded px-2 py-1" />
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleAddLesson(course.id)} className="text-xs px-3 py-1 bg-[#0F7B6C] text-white rounded font-medium">Add Lesson</button>
                        <button onClick={() => setLessonForm(null)} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setLessonForm({ courseId: course.id, title: '', type: 'video', duration: '', videoUrl: '', content: '', pdfUrl: '' })}
                      className="text-xs text-[#0F7B6C] font-medium hover:underline">+ Add Lesson</button>
                  )}
                </div>
              </div>
            ))}

            {courses.length === 0 && <p className="text-center text-gray-400 py-8">No courses yet. Click "+ Add Course" to create one.</p>}
          </div>

          {/* Enrollments */}
          <div className="mt-8">
            <button onClick={async () => { if (!showEnrollments) { try { const data = await adminAPI.getEnrollments(); setEnrollments(data); } catch {} } setShowEnrollments(!showEnrollments); }}
              className="text-sm font-medium text-[#0F7B6C] hover:underline">{showEnrollments ? '▼ Hide' : '▶ Show'} Enrollments ({enrollments.length})</button>
            {showEnrollments && (
              <div className="mt-4 space-y-2">
                {enrollments.length === 0 && <p className="text-gray-400 text-sm">No enrollments yet</p>}
                {enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg text-sm">
                    <span className="font-medium text-gray-900">{e.user?.displayName || e.user?.username || 'User'}</span>
                    <span className="text-gray-500">{e.course?.title || (e.courseId === 'master' ? '👑 Master' : e.courseId)}</span>
                    <span className="text-xs text-gray-400">{e.completedLessons?.length || 0} lessons done</span>
                    {e.completedAt && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✓ Completed</span>}
                    {e.certificateId && <span className="text-xs font-mono text-blue-600">{e.certificateId}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
