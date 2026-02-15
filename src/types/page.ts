export interface Page {
  id: string;
  path: string;
  label: string;
  parent_id?: string | null;
  icon?: string;
}
