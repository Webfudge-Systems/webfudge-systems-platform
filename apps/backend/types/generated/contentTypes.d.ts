import type { Schema, Struct } from '@strapi/strapi'

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens'
  info: {
    description: ''
    displayName: 'Api Token'
    name: 'Api Token'
    pluralName: 'api-tokens'
    singularName: 'api-token'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    accessKey: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.String &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }> &
    Schema.Attribute.DefaultTo<''>
    encryptedKey: Schema.Attribute.Text &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    expiresAt: Schema.Attribute.DateTime
    lastUsedAt: Schema.Attribute.DateTime
    lifespan: Schema.Attribute.BigInteger
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::api-token-permission'>
    publishedAt: Schema.Attribute.DateTime
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
    Schema.Attribute.Required &
    Schema.Attribute.DefaultTo<'read-only'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions'
  info: {
    description: ''
    displayName: 'API Token Permission'
    name: 'API Token Permission'
    pluralName: 'api-token-permissions'
    singularName: 'api-token-permission'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token-permission'> &
    Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions'
  info: {
    description: ''
    displayName: 'Permission'
    name: 'Permission'
    pluralName: 'permissions'
    singularName: 'permission'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
    Schema.Attribute.Private
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>
    subject: Schema.Attribute.String &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles'
  info: {
    description: ''
    displayName: 'Role'
    name: 'Role'
    pluralName: 'roles'
    singularName: 'role'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    code: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> & Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>
  }
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions'
  info: {
    description: 'Session Manager storage'
    displayName: 'Session'
    name: 'Session'
    pluralName: 'sessions'
    singularName: 'session'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
    i18n: {
      localized: false
    }
  }
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private
    childId: Schema.Attribute.String & Schema.Attribute.Private
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    deviceId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
    Schema.Attribute.Private
    origin: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    sessionId: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Private &
    Schema.Attribute.Unique
    status: Schema.Attribute.String & Schema.Attribute.Private
    type: Schema.Attribute.String & Schema.Attribute.Private
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    userId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private
  }
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens'
  info: {
    description: ''
    displayName: 'Transfer Token'
    name: 'Transfer Token'
    pluralName: 'transfer-tokens'
    singularName: 'transfer-token'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    accessKey: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.String &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }> &
    Schema.Attribute.DefaultTo<''>
    expiresAt: Schema.Attribute.DateTime
    lastUsedAt: Schema.Attribute.DateTime
    lifespan: Schema.Attribute.BigInteger
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token-permission'>
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface AdminTransferTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions'
  info: {
    description: ''
    displayName: 'Transfer Token Permission'
    name: 'Transfer Token Permission'
    pluralName: 'transfer-token-permissions'
    singularName: 'transfer-token-permission'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token-permission'> &
    Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users'
  info: {
    description: ''
    displayName: 'User'
    name: 'User'
    pluralName: 'users'
    singularName: 'user'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.Private & Schema.Attribute.DefaultTo<false>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    email: Schema.Attribute.Email &
    Schema.Attribute.Required &
    Schema.Attribute.Private &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 6
    }>
    firstname: Schema.Attribute.String &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    isActive: Schema.Attribute.Boolean &
    Schema.Attribute.Private &
    Schema.Attribute.DefaultTo<false>
    lastname: Schema.Attribute.String &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> & Schema.Attribute.Private
    password: Schema.Attribute.Password &
    Schema.Attribute.Private &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 6
    }>
    preferedLanguage: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> & Schema.Attribute.Private
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    username: Schema.Attribute.String
  }
}

export interface ApiAppApp extends Struct.CollectionTypeSchema {
  collectionName: 'apps'
  info: {
    description: 'Applications available in the platform'
    displayName: 'App'
    pluralName: 'apps'
    singularName: 'app'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    basePrice: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    category: Schema.Attribute.String
    color: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.Text
    features: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>
    icon: Schema.Attribute.String
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::app.app'> & Schema.Attribute.Private
    modules: Schema.Attribute.Relation<'oneToMany', 'api::module.module'>
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiClientAccountClientAccount extends Struct.CollectionTypeSchema {
  collectionName: 'client_accounts'
  info: {
    description: 'Converted client companies and business accounts'
    displayName: 'Client Account'
    pluralName: 'client-accounts'
    singularName: 'client-account'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    accountType: Schema.Attribute.String & Schema.Attribute.DefaultTo<'STANDARD'>
    address: Schema.Attribute.String
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    billingCycle: Schema.Attribute.String & Schema.Attribute.DefaultTo<'MONTHLY'>
    city: Schema.Attribute.String
    companyName: Schema.Attribute.String & Schema.Attribute.Required
    contacts: Schema.Attribute.Relation<'oneToMany', 'api::contact.contact'>
    contractEndDate: Schema.Attribute.DateTime
    contractStartDate: Schema.Attribute.DateTime
    conversionDate: Schema.Attribute.DateTime
    convertedFromLead: Schema.Attribute.Relation<'oneToOne', 'api::lead-company.lead-company'>
    country: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    dealValue: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    description: Schema.Attribute.Text
    email: Schema.Attribute.Email
    employees: Schema.Attribute.String
    founded: Schema.Attribute.String
    healthScore: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<75>
    industry: Schema.Attribute.String
    linkedIn: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::client-account.client-account'> &
    Schema.Attribute.Private
    notes: Schema.Attribute.Text
    onboardingDate: Schema.Attribute.DateTime
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    paymentTerms: Schema.Attribute.String & Schema.Attribute.DefaultTo<'NET_30'>
    phone: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    state: Schema.Attribute.String
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'ACTIVE'>
    subType: Schema.Attribute.String
    twitter: Schema.Attribute.String
    type: Schema.Attribute.String
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    website: Schema.Attribute.String
    zipCode: Schema.Attribute.String
  }
}

export interface ApiContactContact extends Struct.CollectionTypeSchema {
  collectionName: 'contacts'
  info: {
    description: 'CRM contacts (people)'
    displayName: 'Contact'
    pluralName: 'contacts'
    singularName: 'contact'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    address: Schema.Attribute.String
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    birthDate: Schema.Attribute.Date
    city: Schema.Attribute.String
    clientAccount: Schema.Attribute.Relation<'manyToOne', 'api::client-account.client-account'>
    companyName: Schema.Attribute.String
    companyWebsite: Schema.Attribute.String
    contactRole: Schema.Attribute.String
    country: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    department: Schema.Attribute.String
    email: Schema.Attribute.Email & Schema.Attribute.Required
    firstName: Schema.Attribute.String & Schema.Attribute.Required
    isPrimaryContact: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    jobTitle: Schema.Attribute.String
    lastName: Schema.Attribute.String & Schema.Attribute.Required
    leadCompany: Schema.Attribute.Relation<'manyToOne', 'api::lead-company.lead-company'>
    linkedIn: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::contact.contact'> &
    Schema.Attribute.Private
    notes: Schema.Attribute.Text
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    phone: Schema.Attribute.String
    preferredContactMethod: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    source: Schema.Attribute.String & Schema.Attribute.DefaultTo<'OTHER'>
    state: Schema.Attribute.String
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'ACTIVE'>
    timezone: Schema.Attribute.String
    twitter: Schema.Attribute.String
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    zipCode: Schema.Attribute.String
  }
}

export interface ApiCrmActivityCrmActivity extends Struct.CollectionTypeSchema {
  collectionName: 'crm_activities'
  info: {
    description: 'Audit timeline entries for CRM entities (contacts, lead companies, etc.)'
    displayName: 'CRM Activity'
    pluralName: 'crm-activities'
    singularName: 'crm-activity'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    action: Schema.Attribute.Enumeration<['create', 'update', 'delete', 'comment']> &
    Schema.Attribute.Required
    actor: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    leadCompany: Schema.Attribute.Relation<'manyToOne', 'api::lead-company.lead-company'>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::crm-activity.crm-activity'> &
    Schema.Attribute.Private
    meta: Schema.Attribute.JSON
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    publishedAt: Schema.Attribute.DateTime
    subjectId: Schema.Attribute.Integer & Schema.Attribute.Required
    subjectType: Schema.Attribute.String & Schema.Attribute.Required
    summary: Schema.Attribute.Text & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiDirectMessageDirectMessage extends Struct.CollectionTypeSchema {
  collectionName: 'direct_messages'
  info: {
    description: '1:1 messages between users in an organization'
    displayName: 'Direct Message'
    pluralName: 'direct-messages'
    singularName: 'direct-message'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    content: Schema.Attribute.Text & Schema.Attribute.Required
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::direct-message.direct-message'> &
    Schema.Attribute.Private
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    publishedAt: Schema.Attribute.DateTime
    recipient: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    sender: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiInvitationInvitation extends Struct.CollectionTypeSchema {
  collectionName: 'invitations'
  info: {
    description: 'User invitations to organizations'
    displayName: 'Invitation'
    pluralName: 'invitations'
    singularName: 'invitation'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    acceptedAt: Schema.Attribute.DateTime
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    email: Schema.Attribute.Email & Schema.Attribute.Required
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required
    invitedBy: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::invitation.invitation'> &
    Schema.Attribute.Private
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    permissions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.String & Schema.Attribute.DefaultTo<'User'>
    status: Schema.Attribute.Enumeration<['pending', 'accepted', 'expired']> &
    Schema.Attribute.DefaultTo<'pending'>
    token: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiLeadCompanyLeadCompany extends Struct.CollectionTypeSchema {
  collectionName: 'lead_companies'
  info: {
    description: 'CRM lead companies (potential clients)'
    displayName: 'Lead Company'
    pluralName: 'lead-companies'
    singularName: 'lead-company'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    address: Schema.Attribute.String
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    city: Schema.Attribute.String
    companyName: Schema.Attribute.String & Schema.Attribute.Required
    contacts: Schema.Attribute.Relation<'oneToMany', 'api::contact.contact'>
    convertedAccount: Schema.Attribute.Relation<'oneToOne', 'api::client-account.client-account'>
    convertedAt: Schema.Attribute.DateTime
    country: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    dealValue: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    description: Schema.Attribute.Text
    email: Schema.Attribute.Email
    employees: Schema.Attribute.String
    founded: Schema.Attribute.String
    healthScore: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    industry: Schema.Attribute.String
    linkedIn: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::lead-company.lead-company'> &
    Schema.Attribute.Private
    notes: Schema.Attribute.Text
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    phone: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    score: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    segment: Schema.Attribute.String & Schema.Attribute.DefaultTo<'WARM'>
    source: Schema.Attribute.String & Schema.Attribute.DefaultTo<'WEBSITE'>
    state: Schema.Attribute.String
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'NEW'>
    subType: Schema.Attribute.String
    twitter: Schema.Attribute.String
    type: Schema.Attribute.String
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    website: Schema.Attribute.String
    zipCode: Schema.Attribute.String
  }
}

export interface ApiModuleModule extends Struct.CollectionTypeSchema {
  collectionName: 'modules'
  info: {
    description: 'Modules available for each app'
    displayName: 'Module'
    pluralName: 'modules'
    singularName: 'module'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    app: Schema.Attribute.Relation<'manyToOne', 'api::app.app'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.Text
    features: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>
    icon: Schema.Attribute.String
    isCore: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::module.module'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    pricePerUser: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiNotificationNotification extends Struct.CollectionTypeSchema {
  collectionName: 'notifications'
  info: {
    description: 'In-app notifications for users within an organization'
    displayName: 'Notification'
    pluralName: 'notifications'
    singularName: 'notification'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    data: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    isRead: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::notification.notification'> &
    Schema.Attribute.Private
    message: Schema.Attribute.Text
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    publishedAt: Schema.Attribute.DateTime
    readAt: Schema.Attribute.DateTime
    title: Schema.Attribute.String & Schema.Attribute.Required
    type: Schema.Attribute.Enumeration<
      [
        'info',
        'success',
        'warning',
        'error',
        'lead_created',
        'lead_updated',
        'lead_assigned',
        'deal_created',
        'deal_updated',
        'task_assigned',
        'invite_sent',
        'invite_accepted',
        'system',
      ]
    > &
    Schema.Attribute.DefaultTo<'info'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
  }
}

export interface ApiOrganizationUserOrganizationUser extends Struct.CollectionTypeSchema {
  collectionName: 'organization_users'
  info: {
    description: 'Users belonging to organizations'
    displayName: 'Organization User'
    pluralName: 'organization-users'
    singularName: 'organization-user'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    customPermissions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>
    joinedAt: Schema.Attribute.DateTime
    lastAccessAt: Schema.Attribute.DateTime
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::organization-user.organization-user'
    > &
    Schema.Attribute.Private
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.String & Schema.Attribute.DefaultTo<'User'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
  }
}

export interface ApiOrganizationOrganization extends Struct.CollectionTypeSchema {
  collectionName: 'organizations'
  info: {
    description: 'Organizations/Enterprises in the platform'
    displayName: 'Organization'
    pluralName: 'organizations'
    singularName: 'organization'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    activeModules: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    address: Schema.Attribute.JSON
    companyEmail: Schema.Attribute.Email
    companyPhone: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    industry: Schema.Attribute.Enumeration<
      [
        'technology',
        'finance',
        'healthcare',
        'education',
        'retail',
        'manufacturing',
        'services',
        'other',
      ]
    >
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::organization.organization'> &
    Schema.Attribute.Private
    logo: Schema.Attribute.Media<'images'>
    name: Schema.Attribute.String & Schema.Attribute.Required
    onboardingCompleted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    organizationUsers: Schema.Attribute.Relation<
      'oneToMany',
      'api::organization-user.organization-user'
    >
    owner: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    publishedAt: Schema.Attribute.DateTime
    size: Schema.Attribute.Enumeration<
      ['size_1_10', 'size_11_50', 'size_51_200', 'size_201_500', 'size_500_plus']
    >
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required
    status: Schema.Attribute.Enumeration<['trial', 'active', 'suspended', 'cancelled']> &
    Schema.Attribute.DefaultTo<'trial'>
    subscriptions: Schema.Attribute.Relation<'oneToMany', 'api::subscription.subscription'>
    trialEndsAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    website: Schema.Attribute.String
  }
}

export interface ApiProjectProject extends Struct.CollectionTypeSchema {
  collectionName: 'projects'
  info: {
    description: 'PM projects scoped to an organization'
    displayName: 'Project'
    pluralName: 'projects'
    singularName: 'project'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    budget: Schema.Attribute.Decimal
    clientAccount: Schema.Attribute.Relation<'manyToOne', 'api::lead-company.lead-company'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.Text
    endDate: Schema.Attribute.DateTime
    icon: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::project.project'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    projectManager: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<'name'>
    startDate: Schema.Attribute.DateTime
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'PLANNING'>
    tasks: Schema.Attribute.Relation<'manyToMany', 'api::task.task'>
    teamMembers: Schema.Attribute.Relation<'manyToMany', 'plugin::users-permissions.user'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiSubscriptionSubscription extends Struct.CollectionTypeSchema {
  collectionName: 'subscriptions'
  info: {
    description: 'Organization subscriptions to apps and modules'
    displayName: 'Subscription'
    pluralName: 'subscriptions'
    singularName: 'subscription'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    app: Schema.Attribute.Relation<'manyToOne', 'api::app.app'>
    autoRenew: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>
    basePrice: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    billingCycle: Schema.Attribute.Enumeration<['monthly', 'annual']> &
    Schema.Attribute.DefaultTo<'monthly'>
    calculatedPrice: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    endDate: Schema.Attribute.DateTime
    lastPaymentDate: Schema.Attribute.DateTime
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::subscription.subscription'> &
    Schema.Attribute.Private
    nextBillingDate: Schema.Attribute.DateTime
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    paymentMethod: Schema.Attribute.String
    pricePerUser: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    selectedModules: Schema.Attribute.Relation<'manyToMany', 'api::module.module'>
    startDate: Schema.Attribute.DateTime
    status: Schema.Attribute.Enumeration<['trial', 'active', 'suspended', 'cancelled']> &
    Schema.Attribute.DefaultTo<'trial'>
    totalUsers: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface ApiTaskTask extends Struct.CollectionTypeSchema {
  collectionName: 'tasks'
  info: {
    description: 'PM and CRM tasks scoped to an organization'
    displayName: 'Task'
    pluralName: 'tasks'
    singularName: 'task'
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    assignee: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>
    collaborators: Schema.Attribute.Relation<'manyToMany', 'plugin::users-permissions.user'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.Text
    leadCompany: Schema.Attribute.Relation<'manyToOne', 'api::lead-company.lead-company'>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::task.task'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required
    organization: Schema.Attribute.Relation<'manyToOne', 'api::organization.organization'>
    parent: Schema.Attribute.Relation<'manyToOne', 'api::task.task'>
    priority: Schema.Attribute.Enumeration<['low', 'medium', 'high']> &
    Schema.Attribute.DefaultTo<'medium'>
    progress: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    projects: Schema.Attribute.Relation<'manyToMany', 'api::project.project'>
    publishedAt: Schema.Attribute.DateTime
    scheduledDate: Schema.Attribute.DateTime
    status: Schema.Attribute.Enumeration<
      ['SCHEDULED', 'IN_PROGRESS', 'INTERNAL_REVIEW', 'COMPLETED', 'CANCELLED', 'OVERDUE']
    > &
    Schema.Attribute.DefaultTo<'SCHEDULED'>
    subtasks: Schema.Attribute.Relation<'oneToMany', 'api::task.task'>
    tags: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginContentReleasesRelease extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases'
  info: {
    displayName: 'Release'
    pluralName: 'releases'
    singularName: 'release'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    actions: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release-action'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required
    publishedAt: Schema.Attribute.DateTime
    releasedAt: Schema.Attribute.DateTime
    scheduledAt: Schema.Attribute.DateTime
    status: Schema.Attribute.Enumeration<['ready', 'blocked', 'failed', 'done', 'empty']> &
    Schema.Attribute.Required
    timezone: Schema.Attribute.String
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginContentReleasesReleaseAction extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions'
  info: {
    displayName: 'Release Action'
    pluralName: 'release-actions'
    singularName: 'release-action'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    entryDocumentId: Schema.Attribute.String
    isEntryValid: Schema.Attribute.Boolean
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
    Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    release: Schema.Attribute.Relation<'manyToOne', 'plugin::content-releases.release'>
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale'
  info: {
    collectionName: 'locales'
    description: ''
    displayName: 'Locale'
    pluralName: 'locales'
    singularName: 'locale'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::i18n.locale'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.SetMinMax<
      {
        max: 50
        min: 1
      },
      number
    >
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginReviewWorkflowsWorkflow extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows'
  info: {
    description: ''
    displayName: 'Workflow'
    name: 'Workflow'
    pluralName: 'workflows'
    singularName: 'workflow'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    contentTypes: Schema.Attribute.JSON &
    Schema.Attribute.Required &
    Schema.Attribute.DefaultTo<'[]'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique
    publishedAt: Schema.Attribute.DateTime
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >
    stages: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow-stage'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginReviewWorkflowsWorkflowStage extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages'
  info: {
    description: ''
    displayName: 'Stages'
    name: 'Workflow Stage'
    pluralName: 'workflow-stages'
    singularName: 'workflow-stage'
  }
  options: {
    draftAndPublish: false
    version: '1.1.0'
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
    Schema.Attribute.Private
    name: Schema.Attribute.String
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    workflow: Schema.Attribute.Relation<'manyToOne', 'plugin::review-workflows.workflow'>
  }
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files'
  info: {
    description: ''
    displayName: 'File'
    pluralName: 'files'
    singularName: 'file'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    alternativeText: Schema.Attribute.Text
    caption: Schema.Attribute.Text
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    ext: Schema.Attribute.String
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
    Schema.Attribute.Private
    folderPath: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Private &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    formats: Schema.Attribute.JSON
    hash: Schema.Attribute.String & Schema.Attribute.Required
    height: Schema.Attribute.Integer
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'> &
    Schema.Attribute.Private
    mime: Schema.Attribute.String & Schema.Attribute.Required
    name: Schema.Attribute.String & Schema.Attribute.Required
    previewUrl: Schema.Attribute.Text
    provider: Schema.Attribute.String & Schema.Attribute.Required
    provider_metadata: Schema.Attribute.JSON
    publishedAt: Schema.Attribute.DateTime
    related: Schema.Attribute.Relation<'morphToMany'>
    size: Schema.Attribute.Decimal & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    url: Schema.Attribute.Text & Schema.Attribute.Required
    width: Schema.Attribute.Integer
  }
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders'
  info: {
    displayName: 'Folder'
    pluralName: 'folders'
    singularName: 'folder'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>
    path: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 1
    }>
    pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginUsersPermissionsPermission extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions'
  info: {
    description: ''
    displayName: 'Permission'
    name: 'permission'
    pluralName: 'permissions'
    singularName: 'permission'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.permission'> &
    Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.role'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
  }
}

export interface PluginUsersPermissionsRole extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles'
  info: {
    description: ''
    displayName: 'Role'
    name: 'role'
    pluralName: 'roles'
    singularName: 'role'
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    'content-manager': {
      visible: false
    }
    'content-type-builder': {
      visible: false
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    description: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.role'> &
    Schema.Attribute.Private
    name: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 3
    }>
    permissions: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.permission'>
    publishedAt: Schema.Attribute.DateTime
    type: Schema.Attribute.String & Schema.Attribute.Unique
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    users: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.user'>
  }
}

export interface PluginUsersPermissionsUser extends Struct.CollectionTypeSchema {
  collectionName: 'up_users'
  info: {
    description: ''
    displayName: 'User'
    name: 'user'
    pluralName: 'users'
    singularName: 'user'
  }
  options: {
    draftAndPublish: false
    timestamps: true
  }
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    email: Schema.Attribute.Email &
    Schema.Attribute.Required &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 6
    }>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.user'> &
    Schema.Attribute.Private
    password: Schema.Attribute.Password &
    Schema.Attribute.Private &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 6
    }>
    provider: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private
    role: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.role'>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private
    username: Schema.Attribute.String &
    Schema.Attribute.Required &
    Schema.Attribute.Unique &
    Schema.Attribute.SetMinMaxLength<{
      minLength: 3
    }>
  }
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken
      'admin::api-token-permission': AdminApiTokenPermission
      'admin::permission': AdminPermission
      'admin::role': AdminRole
      'admin::session': AdminSession
      'admin::transfer-token': AdminTransferToken
      'admin::transfer-token-permission': AdminTransferTokenPermission
      'admin::user': AdminUser
      'api::app.app': ApiAppApp
      'api::client-account.client-account': ApiClientAccountClientAccount
      'api::contact.contact': ApiContactContact
      'api::crm-activity.crm-activity': ApiCrmActivityCrmActivity
      'api::direct-message.direct-message': ApiDirectMessageDirectMessage
      'api::invitation.invitation': ApiInvitationInvitation
      'api::lead-company.lead-company': ApiLeadCompanyLeadCompany
      'api::module.module': ApiModuleModule
      'api::notification.notification': ApiNotificationNotification
      'api::organization-user.organization-user': ApiOrganizationUserOrganizationUser
      'api::organization.organization': ApiOrganizationOrganization
      'api::project.project': ApiProjectProject
      'api::subscription.subscription': ApiSubscriptionSubscription
      'api::task.task': ApiTaskTask
      'plugin::content-releases.release': PluginContentReleasesRelease
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction
      'plugin::i18n.locale': PluginI18NLocale
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage
      'plugin::upload.file': PluginUploadFile
      'plugin::upload.folder': PluginUploadFolder
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission
      'plugin::users-permissions.role': PluginUsersPermissionsRole
      'plugin::users-permissions.user': PluginUsersPermissionsUser
    }
  }
}
