import React, { useState, useEffect  } from 'react';
import { Row, Col, Typography, Input, Button, Form, message, Card, Layout, Tabs, Table, Tag, Modal, Space, Popconfirm, Spin } from 'antd';
import { MailOutlined, LockOutlined, ThunderboltOutlined, SyncOutlined, RobotOutlined, LogoutOutlined, EyeOutlined, DeleteOutlined, CloudDownloadOutlined, ArrowRightOutlined, StarOutlined, WarningOutlined, BugOutlined, UndoOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function App() {
  // Application Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);
  const [appUserEmail, setAppUserEmail] = useState('');
  const [appUserName, setAppUserName] = useState('');

  // Email Importing & Dashboard States
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pinnedEmails, setPinnedEmails] = useState([]);
  const [deletedEmails, setDeletedEmails] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCard, setSelectedCard] = useState('All');

  // Manual Copy-Paste Classification States
  const [manualText, setManualText] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  // AI Cognitive View States
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

useEffect(() => {
  const savedPins = JSON.parse(
    localStorage.getItem("pinnedEmails")
  ) || [];

  const savedEmails = JSON.parse(
    localStorage.getItem("savedEmails")
  ) || [];

  const savedDeletedEmails = JSON.parse(
    localStorage.getItem("deletedEmails")
  ) || [];

  setPinnedEmails(savedPins);
  setEmails(savedEmails);
  setDeletedEmails(savedDeletedEmails);
}, []);

useEffect(() => {
  localStorage.setItem(
    "savedEmails",
    JSON.stringify(emails)
  );
}, [emails]);

useEffect(() => {
  localStorage.setItem(
    "deletedEmails",
    JSON.stringify(deletedEmails)
  );
}, [deletedEmails]);

 const handleGoogleLogin = (credentialResponse) => {
  try {
    const user = jwtDecode(credentialResponse.credential);

    setAppUserName(user.name);
    setAppUserEmail(user.email);
    setIsLoggedIn(true);

    message.success(`Welcome ${user.name}!`);
  } catch (error) {
    message.error('Google authentication failed.');
  }
};
  
  const onAppLoginFinish = async (values) => {

  try {

    const response = await axios.post(
      `${API_BASE_URL}/login`,
      {
        email: values.email,
        password: values.password
      }
    );

    if (response.data.status === "success") {

      setAppUserName(response.data.name || values.email);
      setAppUserEmail(values.email);
      setIsLoggedIn(true);

      message.success(
        "Login Successful!"
      );

    } else {

      message.error(
        response.data.message
      );

    }

  } catch (error) {

    message.error(
      "Backend Server Error"
    );

  }
};

const onSignupFinish = async (values) => {

  try {

    const response = await axios.post(
      `${API_BASE_URL}/signup`,
      {
        name: values.name,
        email: values.email,
        password: values.password
      }
    );

    if (response.data.status === "success") {

      message.success(
        "Account Created Successfully!"
      );

      setIsSignIn(true);

    } else {

      message.error(
        response.data.message
      );

    }

  } catch (error) {

    message.error(
      "Signup Failed"
    );

  }

};

  
  const onImportEmailsFinish = async (values) => {
    setLoading(true);
    setIsImportModalOpen(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/fetch-emails`, {
        email: values.email,
        password: values.password
      });

     if (response.data.status === 'success') {
  const initialEmails = response.data.emails.map(item => ({
    ...item,
    category: 'Unclassified',
    sentiment: 'Pending'
  }));

  setEmails(prev => {
    const mergedEmails = [...prev];

    initialEmails.forEach(email => {
      const exists = mergedEmails.some(
        e => e.id === email.id
      );

      if (!exists) {
        mergedEmails.push(email);
      }
    });

    return mergedEmails;
  });

  message.success(`Successfully imported ${response.data.emails.length} emails from your inbox!`);
} else {
        message.error(`Import Failed: ${response.data.message}`);
      }
    } catch (error) {
      message.error('Backend server unavailable. Please ensure the FastAPI service is running.');
    } finally {
      setLoading(false);
    }
  };

  
  const handleManualClassify = async () => {
    if (!manualText.trim()) {
      message.warning('Please paste some email content first!');
      return;
    }
    setManualLoading(true);
    setManualResult(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze-email`, {
        email_text: manualText
      });
      setManualResult(response.data);
      message.success('AI Classification complete!');
    } catch (error) {
      message.error('AI Processing Failed!');
    } finally {
      setManualLoading(false);
    }
  };


  const handleAnalyzeEmail = async (record) => {
    setSelectedEmail(record);
    setIsAiModalOpen(true);
    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/analyze-email`, {
        email_text: record.body
      });
      setAiResult(response.data);
      setEmails(prev => prev.map(item => 
        item.id === record.id 
          ? { ...item, category: response.data.category, sentiment: response.data.sentiment, reply: response.data.reply }
          : item
      ));
    } catch (error) {
      message.error('AI Processing Failed!');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePinEmail = (id) => {
  let updatedPins;

  if (pinnedEmails.includes(id)) {
    updatedPins = pinnedEmails.filter(emailId => emailId !== id);
    message.info('Email unpinned.');
  } else {
    updatedPins = [...pinnedEmails, id];
    message.success('Email pinned.');
  }

  setPinnedEmails(updatedPins);

  localStorage.setItem(
    "pinnedEmails",
    JSON.stringify(updatedPins)
  );
};

  const handleDeleteEmail = (id) => {
    setEmails(prev => {
      const emailToDelete = prev.find(item => item.id === id);

      if (emailToDelete) {
        setDeletedEmails(deletedPrev => {
          if (deletedPrev.some(item => item.id === id)) {
            return deletedPrev;
          }
          return [emailToDelete, ...deletedPrev];
        });
      }

      setPinnedEmails(prevPins => {
        const updatedPins = prevPins.filter(pinId => pinId !== id);
        localStorage.setItem("pinnedEmails", JSON.stringify(updatedPins));
        return updatedPins;
      });

      return prev.filter(item => item.id !== id);
    });

    message.success('Email deleted.');
  };

  const handleRestoreEmail = (id) => {
    setDeletedEmails(prev => {
      const restoredEmail = prev.find(item => item.id === id);
      if (!restoredEmail) return prev;

      setEmails(existingEmails => {
        if (existingEmails.some(item => item.id === id)) {
          return existingEmails;
        }
        return [restoredEmail, ...existingEmails];
      });

      message.success('Email restored.');

      return prev.filter(item => item.id !== id);
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAppUserName('');
    setAppUserEmail('');
    setEmails([]);
    setManualText('');
    setManualResult(null);
    message.info('Session ended.');
  };

  // --- UI Layouts ---


  const renderAuthPage = () => (
    <Row style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      
  
      <Col xs={24} md={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', backgroundColor: '#fff' }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <MailOutlined style={{ fontSize: 24, color: '#4f46e5', marginRight: 10, fontWeight: 'bold' }} />
          <Text strong style={{ fontSize: 20, color: '#1e1b4b', letterSpacing: '-0.5px' }}>EmailFlow AI</Text>
        </div>

        {isSignIn ? (
          /* --- APPLICATION SIGN IN FORM --- */
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Welcome back</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 30 }}>
              Log in to manage your automated support workflows.
            </Text>

            <Row justify="center" style={{ marginBottom: 25 }}>
              <Col xs={24} sm={20} md={16} lg={14} style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 360 }}>
                  <GoogleLogin
                    onSuccess={(credentialResponse) => handleGoogleLogin(credentialResponse)}
                    onError={() => message.error('Google Login Failed')}
                  />
                </div>
              </Col>
            </Row>

            <div style={{ textAlign: 'center', borderBottom: '1px solid #e5e7eb', lineHeight: '0.1em', margin: '20px 0 30px' }}>
              <span style={{ background: '#fff', padding: '0 15px', color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>OR CONTINUE WITH EMAIL</span>
            </div>

            <Form name="app_login" onFinish={onAppLoginFinish} layout="vertical" requiredMark={false}>
              <Form.Item name="email" label={<Text strong style={{ color: '#374151', fontSize: 12 }}>APPLICATION EMAIL</Text>} rules={[{ required: true, type: 'email', message: 'Please enter your email!' }]}>
                <Input placeholder="name@company.com" size="large" style={{ borderRadius: 6, height: 45, backgroundColor: '#f9fafb' }} />
              </Form.Item>

              <Form.Item 
                name="password" 
                label={<Text strong style={{ color: '#374151', fontSize: 12 }}>PASSWORD</Text>} 
                rules={[{ required: true, message: 'Please enter your password!' }]}
              >
                <Input.Password placeholder="••••••••" size="large" style={{ borderRadius: 6, height: 45, backgroundColor: '#f9fafb' }} />
              </Form.Item>

              <Button type="primary" htmlType="submit" block size="large" style={{ height: 45, borderRadius: 6, backgroundColor: '#3b82f6', borderColor: '#3b82f6', fontWeight: 600, marginTop: 10 }}>
                Sign In
              </Button>
            </Form>

            <div style={{ textAlign: 'center', marginTop: 25 }}>
              <Text type="secondary">Don't have an account? </Text>
              <a href="#signup" onClick={() => setIsSignIn(false)} style={{ color: '#4f46e5', fontWeight: 500 }}>Create an account</a>
            </div>
          </div>
        ) : (
          /* --- APPLICATION SIGN UP FORM --- */
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Create an account</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 30 }}>
              Get started with your automated email workflow today.
            </Text>

            <Form name="signup" onFinish={onSignupFinish} layout="vertical" requiredMark={false}>
              <Form.Item name="name" label={<Text strong style={{ color: '#374151', fontSize: 12 }}>FULL NAME</Text>} rules={[{ required: true, message: 'Please enter your name!' }]}>
                <Input placeholder="John Doe" size="large" style={{ borderRadius: 6, height: 45, backgroundColor: '#f9fafb' }} />
              </Form.Item>

              <Form.Item name="email" label={<Text strong style={{ color: '#374151', fontSize: 12 }}>WORK EMAIL ADDRESS</Text>} rules={[{ required: true, type: 'email', message: 'Please enter your email!' }]}>
                <Input placeholder="name@company.com" size="large" style={{ borderRadius: 6, height: 45, backgroundColor: '#f9fafb' }} />
              </Form.Item>

              <Form.Item name="password" label={<Text strong style={{ color: '#374151', fontSize: 12 }}>CREATE PASSWORD</Text>} rules={[{ required: true, message: 'Please set a password!' }]}>
                <Input.Password placeholder="••••••••" size="large" style={{ borderRadius: 6, height: 45, backgroundColor: '#f9fafb' }} />
              </Form.Item>

              <Button type="primary" htmlType="submit" block size="large" style={{ height: 45, borderRadius: 6, backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 600, marginTop: 10 }}>
                Create Account
              </Button>
            </Form>

            <div style={{ textAlign: 'center', marginTop: 25 }}>
              <Text type="secondary">Already have an account? </Text>
              <a href="#signin" onClick={() => setIsSignIn(true)} style={{ color: '#4f46e5', fontWeight: 500 }}>Sign In</a>
            </div>
          </div>
        )}
      </Col>

      
      <Col xs={0} md={12} style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '0 8%', 
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ opacity: 0.05, position: 'absolute', fontSize: '400px', right: '-100px', bottom: '-100px', pointerEvents: 'none' }}>
          <MailOutlined />
        </div>

        <div style={{ maxWidth: 480 }}>
          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '6px 14px', borderRadius: 20, fontSize: 12, color: '#38bdf8', fontWeight: 600, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', marginBottom: 25 }}>
            ✨ AI-POWERED SORTING
          </span>

          <Title level={1} style={{ color: '#ffffff', fontWeight: 700, fontSize: '38px', lineHeight: '1.2', margin: '0 0 20px 0' }}>
            Transform your inbox into a <span style={{ color: '#34d399' }}>structured workflow.</span>
          </Title>

          <Paragraph style={{ color: '#94a3b8', fontSize: 16, lineHeight: '1.6', marginBottom: 40 }}>
            EmailFlow AI automatically classifies, prioritizes, and drafts responses for high-volume support channels with 99.8% accuracy.
          </Paragraph>

          <Row gutter={16}>
            <Col span={12}>
              <Card bordered={false} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <ThunderboltOutlined style={{ fontSize: 20, color: '#38bdf8', marginBottom: 10 }} />
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Instant Triage</div>
                <div style={{ color: '#64748b', fontSize: 12, lineHeight: '1.4' }}>Sort incoming tickets in real-time based on sentiment.</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={false} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <SyncOutlined style={{ fontSize: 20, color: '#34d399', marginBottom: 10 }} />
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Smart Sync</div>
                <div style={{ color: '#64748b', fontSize: 12, lineHeight: '1.4' }}>Seamlessly connects with Gmail and Slack.</div>
              </Card>
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  );

  const renderDashboard = () => {
    const columns = [
      { title: 'From', dataIndex: 'sender', key: 'sender', width: '25%' },
      { title: 'Subject', dataIndex: 'subject', key: 'subject', width: '40%' },
      { 
        title: 'Sentiment', 
        dataIndex: 'sentiment', 
        key: 'sentiment',
        render: (sent) => {
          let bgColor = '#dcfce7';
          let textColor = '#166534';
          if (sent === 'Appreciative') { bgColor = '#dcfce7'; textColor = '#166534'; }
          if (sent === 'Frustrated') { bgColor = '#fee2e2'; textColor = '#991b1b'; }
          if (sent === 'Urgent / Anxious') { bgColor = '#fdf2f8'; textColor = '#9333ea'; }
          return <Tag style={{ backgroundColor: bgColor, color: textColor, border: 'none', fontWeight: 600 }}>{sent}</Tag>;
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space size={8}>
            {selectedCard !== 'Deleted' ? (
              <>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => handleAnalyzeEmail(record)}
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', border: 'none', fontWeight: 600, fontSize: 12 }}
                  size="small"
                >
                  Analyze
                </Button>

                <Button
                  type={pinnedEmails.includes(record.id) ? "primary" : "default"}
                  icon={<StarOutlined />}
                  onClick={() => handlePinEmail(record.id)}
                  style={pinnedEmails.includes(record.id) ? { background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', border: 'none', color: '#fff' } : { border: '1px solid #e5e7eb' }}
                  title={pinnedEmails.includes(record.id) ? 'Unpin' : 'Pin'}
                  size="small"
                />

                <Popconfirm
                  title="Delete this email?"
                  description="This action cannot be undone."
                  onConfirm={() => handleDeleteEmail(record.id)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button danger icon={<DeleteOutlined />} style={{ border: '1px solid #fee2e2', color: '#dc2626' }} size="small" title="Delete" />
                </Popconfirm>
              </>
            ) : (
              <Button
                type="default"
                icon={<UndoOutlined />}
                onClick={() => handleRestoreEmail(record.id)}
                style={{ border: '1px solid #e5e7eb', color: '#111827', fontWeight: 600 }}
                size="small"
              >
                Restore
              </Button>
            )}
          </Space>
        ),
      },
    ];

const getFiltered = (category) => {
  const sourceEmails = selectedCard === "Deleted" ? deletedEmails : emails;

  return sourceEmails.filter(email => {
    let cardMatch = true;

    if (selectedCard === "Pinned") {
      cardMatch = pinnedEmails.includes(email.id);
    }

    if (selectedCard === "Complaints") {
      cardMatch = email.category === "Complaints";
    }

    if (selectedCard === "Urgent") {
      cardMatch =
        email.category === "Urgent Assistance" ||
        email.sentiment === "Urgent / Anxious";
    }

    const categoryMatch =
      category === "All Tickets" ||
      email.category === category;

    const searchMatch =
      email.sender?.toLowerCase().includes(searchText.toLowerCase()) ||
      email.subject?.toLowerCase().includes(searchText.toLowerCase());

    if (selectedCard !== "All" && selectedCard !== "Deleted") {
      return cardMatch && searchMatch;
    }

    return categoryMatch && searchMatch;
  });
};
    const sentimentData = [
      { name: 'Positive', value: emails.filter(email => email.sentiment === 'Positive').length },
      { name: 'Neutral', value: emails.filter(email => email.sentiment === 'Neutral').length },
      { name: 'Appreciative', value: emails.filter(email => email.sentiment === 'Appreciative').length },
      { name: 'Frustrated', value: emails.filter(email => email.sentiment === 'Frustrated').length },
      { name: 'Urgent / Anxious', value: emails.filter(email => email.sentiment === 'Urgent / Anxious').length },
      { name: 'Pending', value: emails.filter(email => email.sentiment === 'Pending').length },
    ];

    const tabItems = [
      'All Tickets', 'General Inquiry', 'Technical Support', 'Feedback & Suggestions', 'Complaints', 'Urgent Assistance', 'Unclassified'
    ].map(cat => ({
      key: cat,
      label: `${cat} (${getFiltered(cat).length})`,
      children: <Table dataSource={getFiltered(cat)} columns={columns} rowKey="id" />
    }));

    return (
      <Layout style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <Header style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ fontSize: 28, color: '#ffffff', marginRight: 12, fontWeight: 'bold' }} />
            <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>EmailFlow AI Studio</Title>
          </div>
          <Space size={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>Welcome:</Text>
              <Text strong style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>{appUserName || appUserEmail}</Text>
            </div>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#ffffff', fontWeight: 500, fontSize: 14 }}>Logout</Button>
          </Space>
        </Header>

        <Content style={{ padding: '32px', backgroundColor: '#f3f4f6' }}>

             <Row gutter={20} style={{ marginBottom: 32 }}>

  <Col xs={24} sm={12} lg={6}>
    <Card
      hoverable
      onClick={() => setSelectedCard("All")}
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        border: selectedCard === "All" ? '2px solid #4f46e5' : '1px solid #e5e7eb',
        background: selectedCard === "All" ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(79, 70, 229, 0.02) 100%)' : '#ffffff',
        transition: 'all 0.3s ease',
        boxShadow: selectedCard === "All" ? '0 4px 12px rgba(79, 70, 229, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <MailOutlined style={{ fontSize: 32, color: '#4f46e5', marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>Total Emails</div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 700, fontSize: 28 }}>{emails.length}</h2>
      </div>
    </Card>
  </Col>

  <Col xs={24} sm={12} lg={6}>
    <Card
      hoverable
      onClick={() => setSelectedCard("Urgent")}
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        border: selectedCard === "Urgent" ? '2px solid #f59e0b' : '1px solid #e5e7eb',
        background: selectedCard === "Urgent" ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%)' : '#ffffff',
        transition: 'all 0.3s ease',
        boxShadow: selectedCard === "Urgent" ? '0 4px 12px rgba(245, 158, 11, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <WarningOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>Urgent Tickets</div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 700, fontSize: 28 }}>
          {
            emails.filter(
              e =>
                e.category === "Urgent Assistance" ||
                e.sentiment === "Urgent / Anxious"
            ).length
          }
        </h2>
      </div>
    </Card>
  </Col>

  <Col xs={24} sm={12} lg={6}>
    <Card
      hoverable
      onClick={() => setSelectedCard("Complaints")}
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        border: selectedCard === "Complaints" ? '2px solid #ef4444' : '1px solid #e5e7eb',
        background: selectedCard === "Complaints" ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)' : '#ffffff',
        transition: 'all 0.3s ease',
        boxShadow: selectedCard === "Complaints" ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <BugOutlined style={{ fontSize: 32, color: '#ef4444', marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>Complaints</div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 700, fontSize: 28 }}>
          {
            emails.filter(
              e => e.category === "Complaints"
            ).length
          }
        </h2>
      </div>
    </Card>
  </Col>

  <Col xs={24} sm={12} lg={6}>
    <Card
      hoverable
      onClick={() => setSelectedCard("Pinned")}
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        border: selectedCard === "Pinned" ? '2px solid #10b981' : '1px solid #e5e7eb',
        background: selectedCard === "Pinned" ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)' : '#ffffff',
        transition: 'all 0.3s ease',
        boxShadow: selectedCard === "Pinned" ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <StarOutlined style={{ fontSize: 32, color: '#10b981', marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>Pinned</div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 700, fontSize: 28 }}>
          {
            emails.filter(email =>
              pinnedEmails.includes(email.id)
            ).length
          }
        </h2>
      </div>
    </Card>
  </Col>

</Row>

          <Row gutter={28}>
          
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ThunderboltOutlined style={{ fontSize: 18, color: '#f59e0b' }} />
                    <span style={{ fontWeight: 600, color: '#111827' }}>Quick AI Analysis</span>
                  </div>
                } 
                bordered={false} 
                style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}
              >
                <Paragraph type="secondary" style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Paste customer email content to instantly analyze sentiment, category, and generate replies.</Paragraph>
                <TextArea 
                  rows={6} 
                  placeholder="Paste raw email content here..." 
                  value={manualText} 
                  onChange={(e) => setManualText(e.target.value)}
                  style={{ borderRadius: 8, marginBottom: 16, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <Button 
                  type="primary" 
                  block 
                  icon={<ArrowRightOutlined />} 
                  loading={manualLoading} 
                  onClick={handleManualClassify} 
                  style={{ height: 40, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', border: 'none', fontWeight: 600, fontSize: 14, letterSpacing: '0.3px', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}
                >
                  Run Instant AI Triage
                </Button>

                {manualResult && (
                  <Card style={{ marginTop: 20, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Category</div>
                      <Tag color="processing" style={{ backgroundColor: '#dcfce7', color: '#166534', border: 'none' }}>{manualResult.category}</Tag>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sentiment</div>
                      <Tag color="purple" style={{ backgroundColor: '#fdf2f8', color: '#9333ea', border: 'none' }}>{manualResult.sentiment}</Tag>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Suggested Reply:</div>
                    <div style={{ backgroundColor: '#fff', padding: 12, borderRadius: 6, fontSize: 13, border: '1px solid #dcfce7', whiteSpace: 'pre-wrap', color: '#374151', lineHeight: '1.5' }}>{manualResult.reply}</div>
                  </Card>
                )}
              </Card>

              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>Sentiment Distribution</span>
                  </div>
                }
                bordered={false}
                style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}
              >
                {sentimentData.every(item => item.value === 0) ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                    No sentiment data available
                  </div>
                ) : (
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData.filter(item => item.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {sentimentData.filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${entry.name}`} fill={['#22c55e', '#60a5fa', '#8b5cf6', '#f97316', '#ef4444', '#94a3b8'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}`, 'Count']} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card
                size="small"
                bordered={false}
                style={{
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  marginBottom: 24,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                title={<span style={{ fontWeight: 600, color: '#111827' }}>Deleted Emails</span>}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Deleted Emails</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{deletedEmails.length}</div>
                  </div>
                  <Button type="default" onClick={() => setSelectedCard('Deleted')} style={{ minWidth: 120, borderRadius: 8 }}>
                    View Deleted
                  </Button>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MailOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
                    <span style={{ fontWeight: 600, color: '#111827' }}>Email Inbox</span>
                  </div>
                } 
                extra={
                  <Button 
                    type="primary" 
                    icon={<CloudDownloadOutlined />} 
                    onClick={() => setIsImportModalOpen(true)}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', border: 'none', fontWeight: 600, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
                  >
                    Import Gmail Emails
                  </Button>
                }
                bordered={false} 
                style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}
              >
                <Input.Search
                  placeholder="🔍 Search by sender or subject..."
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ marginBottom: 20 }}
                  size="large"
                  style={{ height: 40, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Spin size="large" tip="Connecting to mail servers..." style={{ color: '#4f46e5' }} />
                  </div>
                ) : emails.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: 8 }}>
                    <MailOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block', color: '#d1d5db' }} />
                    <p style={{ color: '#6b7280', fontSize: 15 }}>No emails imported yet</p>
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>Click "Import Gmail Emails" to connect your Gmail inbox</p>
                  </div>
                ) : (
                  selectedCard === 'Deleted' ? (
                    <Table dataSource={getFiltered('All Tickets')} columns={columns} rowKey="id" />
                  ) : (
                    <Tabs defaultActiveKey="All Tickets" items={tabItems} style={{ marginTop: 16 }} />
                  )
                )}
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  };

  return (
    <div>
      {isLoggedIn ? renderDashboard() : renderAuthPage()}

  
      <Modal 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            <LockOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
            Connect Your Email Account
          </div>
        } 
        open={isImportModalOpen} 
        onCancel={() => setIsImportModalOpen(false)} 
        footer={null}
        style={{ borderRadius: 12 }}
      >
        <Paragraph type="secondary" style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Your credentials are encrypted and never stored. We only access your mailbox to download emails.</Paragraph>
        <Paragraph type="secondary" style={{ color: '#6b7280', marginBottom: 24, fontSize: 14, fontStyle: 'italic' }}>Currently supports Gmail integration.</Paragraph>
        <Form name="import_emails" onFinish={onImportEmailsFinish} layout="vertical">
          <Form.Item 
            name="email" 
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Gmail Address</span>} 
            rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}
          >
            <Input 
              placeholder="username@gmail.com" 
              size="large" 
              style={{ height: 40, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
            />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={<span style={{ fontWeight: 600, color: '#374151' }}>App Password or Server Token</span>} 
            rules={[{ required: true, message: 'Please enter your app password!' }]}
          >
            <Input.Password 
              placeholder="••••••••" 
              size="large" 
              style={{ height: 40, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
            />
          </Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large" 
            style={{ height: 44, background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', border: 'none', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', borderRadius: 8 }}
          >
            Connect & Download Emails
          </Button>
        </Form>
      </Modal>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            <RobotOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
            AI Email Analysis
          </div>
        }
        open={isAiModalOpen}
        onCancel={() => setIsAiModalOpen(false)}
        footer={null}
        style={{ borderRadius: 12 }}
      >
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>Email Content</div>
              <Card style={{ backgroundColor: '#f9fafb', maxHeight: 140, overflowY: 'auto', marginBottom: 0, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {selectedEmail?.body || 'Select an email to view its body.'}
              </Card>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="AI is analyzing..." style={{ color: '#4f46e5' }} /></div>
              ) : aiResult ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>Category</div>
                        <Tag color="processing" style={{ backgroundColor: '#dcfce7', color: '#166534', border: 'none', fontWeight: 600 }}>{aiResult.category}</Tag>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>Sentiment</div>
                        <Tag color="purple" style={{ backgroundColor: '#fdf2f8', color: '#9333ea', border: 'none', fontWeight: 600 }}>{aiResult.sentiment}</Tag>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.3px' }}>📝 AI Suggested Reply</div>
                    <Card style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#166534', lineHeight: 1.6, fontSize: 13 }}>{aiResult.reply}</Paragraph>
                    </Card>
                  </div>
                </div>
              ) : null}
            </div>
      </Modal>
    </div>
  );
}

export default App;