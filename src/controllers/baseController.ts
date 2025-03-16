import { Request, Response } from "express";
import { Model } from "mongoose";

class BaseController<T> {
  model: Model<T>;
  constructor(model: Model<T>) {
    if (!model) throw new Error("Model is undefined! Check the import.");
    this.model = model;
    console.log("BaseController initialized with model:", model);
  }

  async create(req: Request, res: Response) {
    const body = req.body;
    console.log(body);
    try {
      console.log("Creating item with data:", body);
      const item = await this.model.create(body);
      res.status(201).send(item);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async getAll(req: Request, res: Response, filterKey: string) {
    console.log(req.params);
    const filterValue = req.params[filterKey]; // Get the filter value dynamically
    console.log(`Filter [${filterKey}]:`, filterValue);

    try {
      if (filterValue) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = await this.model.find({ [filterKey]: filterValue } as any); // Get items by filter
        console.log("Items found:", item);
        res.send(item);
      } else {
        const items = await this.model.find(); // Get all items
        res.send(items);
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    try {
      const item = await this.model.findById(id);
      if (item != null) {
        res.send(item);
      } else {
        res.status(404).json({ message: "not found" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const body = req.body;
    let item;

    try {
      // First, try to find by ID if provided
      if (req.params.id) {
        item = await this.model.findById(req.params.id);
      } else if (req.params.userName) {
        // Otherwise, try to find by username
        item = await this.model.findOne({ userName: req.params.userName });
      } else {
        res.status(400).json({ message: "No valid identifier provided" });
        return;
      }

      console.log("Item found:", item);
      if (!item) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      console.log("Updating item with data:", body);
      item.set(body);
      await item.save();
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) {
        res.status(404).json({ message: "not found" });
        return;
      }
      await item.deleteOne();
      res.json({ message: "deleted" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}

export default BaseController;
